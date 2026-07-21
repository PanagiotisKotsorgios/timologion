import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getProviderConfig,
  createState,
  OAUTH_STATE_COOKIE,
  providerFromSegment,
} from "@/lib/auth/oauth";
import { env } from "@/lib/env";
import { consume, LIMITS, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: segment } = await params;
  const provider = providerFromSegment(segment);
  if (!provider) {
    return NextResponse.json({ error: "unknown provider" }, { status: 400 });
  }

  const rl = consume(
    `oauth-start:${clientIp(req)}`,
    LIMITS.oauthStart.capacity,
    LIMITS.oauthStart.refillMs,
  );
  if (!rl.ok) {
    return NextResponse.redirect(
      `${env.APP_BASE_URL}/login?error=rate_limited`,
    );
  }

  const cfg = getProviderConfig(provider);
  if (!cfg) {
    return NextResponse.redirect(
      `${env.APP_BASE_URL}/login?error=oauth_disabled`,
    );
  }

  const { raw, cookieValue } = createState();
  const url = new URL(cfg.authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("scope", cfg.scope);
  url.searchParams.set("state", raw);
  if (provider === "google") {
    url.searchParams.set("access_type", "online");
    url.searchParams.set("prompt", "select_account");
  }

  const jar = await cookies();
  jar.set(OAUTH_STATE_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(url.toString());
}
