import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { verifyApiKey } from "@/lib/api-keys";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export type KalypsisApiContext = {
  businessId: string;
  keyId: string;
  scopes: string[];
};

/** Authenticate a server-to-server Kalypsis request without exposing a
 * Timologion session cookie or Wrapp credential. API keys are hashed by the
 * existing ApiKey subsystem and are scoped to exactly one business. */
export async function requireKalypsisApiKey(
  request: NextRequest,
): Promise<KalypsisApiContext | null> {
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const verified = await verifyApiKey(bearer);
  // Do not accept a general-purpose Timologion key for the bridge. The key
  // must be explicitly minted for Kalypsis, so revoking/scoping a normal API
  // key cannot accidentally expose the accounting connector.
  if (!verified || (!verified.scopes.includes("integration:kalypsis") && !verified.scopes.includes("*"))) return null;
  return verified;
}

export function productionIssueEnabled(): boolean {
  return env.KALYPSIS_ALLOW_PRODUCTION_ISSUE === "true";
}

export async function requireTenantAdminSession() {
  const session = await getSession();
  if (!session) return null;
  const membership = session.activeBusinessId
    ? await prisma.businessMember.findFirst({
        where: { userId: session.userId, businessId: session.activeBusinessId },
        select: { businessId: true, role: true },
      })
    : null;
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return null;
  }
  return { ...session, businessId: membership.businessId, role: membership.role };
}

export function unauthorized() {
  return Response.json({ ok: false, error: "Μη εξουσιοδοτημένο αίτημα." }, { status: 401 });
}

export function forbidden(message = "Δεν επιτρέπεται η συγκεκριμένη ενέργεια.") {
  return Response.json({ ok: false, error: message }, { status: 403 });
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
