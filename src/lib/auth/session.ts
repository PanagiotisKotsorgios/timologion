import { randomBytes, createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { SESSION_COOKIE } from "./constants";

export { SESSION_COOKIE };
// "Remember me": long-lived rolling session cookie.
// Otherwise: short-lived session ends when browser closes.
const SESSION_TTL_MS_REMEMBER = 1000 * 60 * 60 * 24 * 30; // 30 days rolling
const SESSION_TTL_MS_SHORT = 1000 * 60 * 60 * 12; // 12h
const REFRESH_THRESHOLD_MS = 1000 * 60 * 60 * 24; // rotate if <1d remaining

function hashToken(token: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(token).digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(
  userId: string,
  meta: {
    userAgent?: string;
    ipAddress?: string;
    remember?: boolean;
  } = {},
) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const ttl = meta.remember ? SESSION_TTL_MS_REMEMBER : SESSION_TTL_MS_SHORT;
  const expiresAt = new Date(Date.now() + ttl);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 250),
      ipAddress: meta.ipAddress?.slice(0, 60),
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    // When remember is false, omit `expires` so the cookie becomes a session
    // cookie that dies with the browser tab.
    ...(meta.remember ? { expires: expiresAt } : {}),
  });

  return { token, expiresAt };
}

export type ResolvedSession = {
  sessionId: string;
  userId: string;
  activeBusinessId: string | null;
  expiresAt: Date;
};

export async function getSession(): Promise<ResolvedSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      activeBusinessId: true,
      expiresAt: true,
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session
      .delete({ where: { id: session.id } })
      .catch(() => undefined);
    return null;
  }

  // Rolling refresh: bump the expiry in whichever bracket the session was in
  // (remember-me vs short) based on the current TTL. Simplification: use the
  // longer TTL as the ceiling; short sessions naturally end with the browser.
  if (
    session.expiresAt.getTime() - Date.now() <
    SESSION_TTL_MS_REMEMBER - REFRESH_THRESHOLD_MS
  ) {
    const newExpiry = new Date(Date.now() + SESSION_TTL_MS_REMEMBER);
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiry, lastSeenAt: new Date() },
    });
  }

  return {
    sessionId: session.id,
    userId: session.userId,
    activeBusinessId: session.activeBusinessId,
    expiresAt: session.expiresAt,
  };
}

export async function setActiveBusiness(
  sessionId: string,
  businessId: string | null,
) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { activeBusinessId: businessId },
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session
      .deleteMany({ where: { tokenHash } })
      .catch(() => undefined);
  }
  jar.delete(SESSION_COOKIE);
}
