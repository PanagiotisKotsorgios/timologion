import { randomBytes, createHmac } from "node:crypto";
import { env } from "@/lib/env";

export type OAuthProviderKey = "google" | "facebook";

export type OAuthConfig = {
  key: OAuthProviderKey;
  authorizeUrl: string;
  tokenUrl: string;
  profileUrl: string;
  scope: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

function redirectFor(provider: OAuthProviderKey): string {
  // Note: the URL segment for Facebook is "fb" to avoid ad-blocker filter
  // lists that match on the word "facebook" in URLs.
  const segment = provider === "facebook" ? "fb" : provider;
  return `${env.APP_BASE_URL.replace(/\/$/, "")}/api/auth/${segment}/callback`;
}

export function providerFromSegment(segment: string): OAuthProviderKey | null {
  if (segment === "google") return "google";
  if (segment === "fb" || segment === "facebook") return "facebook";
  return null;
}

export function getProviderConfig(
  provider: OAuthProviderKey,
): OAuthConfig | null {
  if (provider === "google") {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
    return {
      key: "google",
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      profileUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
      scope: "openid email profile",
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: redirectFor("google"),
    };
  }
  if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET) return null;
  return {
    key: "facebook",
    authorizeUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    profileUrl: "https://graph.facebook.com/me?fields=id,name,email",
    scope: "email public_profile",
    clientId: env.FACEBOOK_APP_ID,
    clientSecret: env.FACEBOOK_APP_SECRET,
    redirectUri: redirectFor("facebook"),
  };
}

export function isProviderConfigured(provider: OAuthProviderKey): boolean {
  return getProviderConfig(provider) !== null;
}

// ─── State cookie: opaque nonce, hashed with session secret ──────────────

const STATE_TTL_MS = 10 * 60 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", env.SESSION_SECRET)
    .update(payload)
    .digest("hex");
}

export function createState(): { raw: string; cookieValue: string } {
  const raw = randomBytes(24).toString("hex");
  const expires = Date.now() + STATE_TTL_MS;
  const payload = `${raw}.${expires}`;
  return { raw, cookieValue: `${payload}.${sign(payload)}` };
}

export function verifyState(
  provided: string,
  cookieValue: string | undefined,
): boolean {
  if (!cookieValue) return false;
  const parts = cookieValue.split(".");
  if (parts.length !== 3) return false;
  const [raw, expires, mac] = parts as [string, string, string];
  if (sign(`${raw}.${expires}`) !== mac) return false;
  if (Number(expires) < Date.now()) return false;
  return raw === provided;
}

export const OAUTH_STATE_COOKIE = "etl_oauth_state";

// ─── Provider calls ──────────────────────────────────────────────────────

export type OAuthProfile = {
  providerUserId: string;
  email: string | null;
  fullName: string;
};

export async function exchangeCodeForProfile(
  cfg: OAuthConfig,
  code: string,
): Promise<OAuthProfile> {
  const params = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: params.toString(),
  });
  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed: ${tokenRes.status}`);
  }
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    id_token?: string;
  };
  const accessToken = tokenJson.access_token;
  if (!accessToken) throw new Error("No access_token in provider response.");

  const profileRes = await fetch(cfg.profileUrl, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) {
    throw new Error(`Profile fetch failed: ${profileRes.status}`);
  }
  const profile = (await profileRes.json()) as {
    sub?: string;
    id?: string;
    email?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
  };

  const providerUserId = profile.sub ?? profile.id ?? "";
  if (!providerUserId) throw new Error("Provider did not return a user id.");

  const fullName =
    profile.name ??
    [profile.given_name, profile.family_name].filter(Boolean).join(" ") ??
    profile.email ??
    "";

  return {
    providerUserId,
    email: profile.email ?? null,
    fullName: fullName.slice(0, 120),
  };
}
