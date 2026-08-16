import "server-only";
import { cookies, headers } from "next/headers";

/**
 * Per-request runtime mode.
 *
 * `production` (default) — every Wrapp API call hits the production
 * endpoint (https://wrapp.ai/api/v1) with the production partner API key.
 *
 * `staging` — every Wrapp API call hits the staging endpoint
 * (https://staging.wrapp.ai/api/v1) with the staging partner API key.
 * Local DB, users, businesses, documents stay the same — only the
 * outbound Wrapp destination changes.
 *
 * Mode is user-scoped via cookie so an admin can flip into staging on
 * their own browser without affecting other tenants. Middleware reads
 * the same cookie and pre-populates a request header, which is what
 * `getRuntimeMode()` returns first (cheaper than parsing a cookie).
 *
 * How the mode is entered / exited:
 *   /staging       → middleware sets the cookie, redirects to /
 *   /staging/exit  → middleware clears the cookie, redirects to /
 *   Banner button on any /app or /admin page also calls /staging/exit
 */
export type RuntimeMode = "production" | "staging";

export const RUNTIME_MODE_COOKIE = "timologion-mode";
export const RUNTIME_MODE_HEADER = "x-timologion-mode";

/** Server-side: resolve the effective runtime mode for this request. */
export async function getRuntimeMode(): Promise<RuntimeMode> {
  // Fast path: middleware wrote the mode into a request header on
  // every request, no cookie parsing needed at page render time.
  const h = await headers();
  const fromHeader = h.get(RUNTIME_MODE_HEADER);
  if (fromHeader === "staging" || fromHeader === "production") {
    return fromHeader;
  }
  // Slow path: cookie fallback for code paths that fire before
  // middleware has a chance to set the header (rare — mostly tests).
  const jar = await cookies();
  const cookieVal = jar.get(RUNTIME_MODE_COOKIE)?.value;
  return cookieVal === "staging" ? "staging" : "production";
}

/** True when the client is currently in staging mode. */
export async function isStagingMode(): Promise<boolean> {
  return (await getRuntimeMode()) === "staging";
}
