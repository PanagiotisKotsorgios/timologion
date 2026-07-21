import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { createSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import {
  exchangeCodeForProfile,
  getProviderConfig,
  verifyState,
  OAUTH_STATE_COOKIE,
  providerFromSegment,
} from "@/lib/auth/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(reason: string): Response {
  return NextResponse.redirect(
    `${env.APP_BASE_URL}/login?error=${encodeURIComponent(reason)}`,
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: segment } = await params;
  const provider = providerFromSegment(segment);
  if (!provider) return fail("unknown_provider");

  const cfg = getProviderConfig(provider);
  if (!cfg) return fail("oauth_disabled");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  if (err) return fail(err);
  if (!code || !state) return fail("missing_params");

  const jar = await cookies();
  const stateCookie = jar.get(OAUTH_STATE_COOKIE)?.value;
  if (!verifyState(state, stateCookie)) return fail("bad_state");
  jar.delete(OAUTH_STATE_COOKIE);

  let profile;
  try {
    profile = await exchangeCodeForProfile(cfg, code);
  } catch {
    return fail("oauth_exchange_failed");
  }

  // 1) Existing oauth link?
  const existingLink = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerUserId: {
        provider,
        providerUserId: profile.providerUserId,
      },
    },
    select: { userId: true },
  });

  let userId: string;

  if (existingLink) {
    userId = existingLink.userId;
  } else if (profile.email) {
    // 2) Match by email → link account
    const existingUser = await prisma.user.findUnique({
      where: { email: profile.email.toLowerCase() },
      select: { id: true },
    });
    if (existingUser) {
      await prisma.oAuthAccount.create({
        data: {
          userId: existingUser.id,
          provider,
          providerUserId: profile.providerUserId,
          email: profile.email,
        },
      });
      userId = existingUser.id;
    } else {
      // 3) Create fresh user with no password. OAuth providers vouch for the
      //    email, so mark it verified immediately.
      const user = await prisma.user.create({
        data: {
          email: profile.email.toLowerCase(),
          fullName: profile.fullName || profile.email,
          passwordHash: null,
          emailVerifiedAt: new Date(),
          oauthAccounts: {
            create: {
              provider,
              providerUserId: profile.providerUserId,
              email: profile.email,
            },
          },
        },
        select: { id: true },
      });
      userId = user.id;
    }
  } else {
    return fail("no_email_from_provider");
  }

  const hdr = await headers();
  await createSession(userId, {
    userAgent: hdr.get("user-agent") ?? undefined,
    ipAddress:
      hdr.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      hdr.get("x-real-ip") ??
      undefined,
    remember: true,
  });

  await logAudit({
    userId,
    action: `auth.oauth.${provider}`,
    entityType: "User",
    entityId: userId,
  });

  const hasMembership = await prisma.businessMember.findFirst({
    where: { userId },
    select: { businessId: true },
  });

  return NextResponse.redirect(
    `${env.APP_BASE_URL}${hasMembership ? "/app" : "/app/onboarding"}`,
  );
}
