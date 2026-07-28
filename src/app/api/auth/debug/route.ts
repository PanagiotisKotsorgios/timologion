import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getProviderConfig } from "@/lib/auth/oauth";

/**
 * Debug endpoint — returns the exact redirect_uri strings the app will
 * send to each OAuth provider. Useful when a provider throws
 * "redirect_uri_mismatch" and you want to know precisely what the app is
 * sending vs what's whitelisted on the provider console. Read-only, no
 * secrets exposed (only IDs / URLs, never client_secret).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const google = getProviderConfig("google");
  const facebook = getProviderConfig("facebook");

  return NextResponse.json(
    {
      appBaseUrl: env.APP_BASE_URL,
      nodeEnv: env.NODE_ENV,
      google: google
        ? {
            configured: true,
            clientIdSuffix: google.clientId.slice(-16),
            redirectUri: google.redirectUri,
          }
        : { configured: false },
      facebook: facebook
        ? {
            configured: true,
            clientIdSuffix: facebook.clientId.slice(-8),
            redirectUri: facebook.redirectUri,
          }
        : { configured: false },
      hint: "Copy the exact `redirectUri` above into the Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs. Values must match byte-for-byte (protocol, host, path, no trailing slash).",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
