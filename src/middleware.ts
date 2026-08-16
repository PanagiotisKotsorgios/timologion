import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

// Cookie name duplicated from src/lib/runtime-mode.ts because middleware
// can't import server-only modules. Kept in sync by convention.
const RUNTIME_MODE_COOKIE = "timologion-mode";
// 7 days — long enough that a QA session doesn't get flipped mid-way,
// short enough that a shared browser doesn't stay in staging forever.
const RUNTIME_MODE_COOKIE_TTL = 7 * 24 * 60 * 60;

/**
 * Middleware does two jobs:
 *
 *   1. /staging       → set the runtime-mode cookie to "staging" so
 *                       subsequent Wrapp calls hit staging.wrapp.ai.
 *      /staging/exit  → clear the cookie, redirect to /app.
 *      /staging/<x>   → set the cookie, redirect to /<x>.
 *
 *   2. Bounce clearly-unauthenticated users out of /app + /admin.
 *
 * Deliberately does NOT redirect authenticated users away from /login
 * or /register. That branch existed but caused an infinite redirect
 * loop the moment a session cookie outlived its DB row:
 *
 *     /app → requireTenant sees null → redirect /login → middleware
 *     sees cookie → redirect /app → … (ERR_TOO_MANY_REDIRECTS)
 *
 * The right layer for "logged-in users don't need /login" is the
 * /login page itself, which can call getSession() and verify the row
 * still exists before redirecting. Doing that check in middleware
 * would require a DB hit on every request — not worth it.
 *
 * Also deliberately does NOT mutate request headers here. The previous
 * approach set `x-timologion-mode` on the request to speed up
 * getRuntimeMode() on the server, but the fallback path (reading the
 * cookie directly) is fast enough and avoids the whole class of
 * middleware-loop risks around `NextResponse.next({request: {…}})`.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── /staging entry / exit ─────────────────────────────────────────
  if (pathname === "/staging/exit" || pathname === "/staging/exit/") {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    const res = NextResponse.redirect(url);
    res.cookies.set(RUNTIME_MODE_COOKIE, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });
    return res;
  }

  if (pathname === "/staging" || pathname === "/staging/") {
    // Let the /staging page render normally; just set the cookie on
    // the response so any Wrapp call on that page already knows.
    const res = NextResponse.next();
    res.cookies.set(RUNTIME_MODE_COOKIE, "staging", {
      path: "/",
      maxAge: RUNTIME_MODE_COOKIE_TTL,
      sameSite: "lax",
    });
    return res;
  }

  if (pathname.startsWith("/staging/")) {
    // Deep-link into the app while flipping to staging mode. Strip the
    // prefix so /staging/app/documents becomes /app/documents, and set
    // the cookie on the response.
    const rewritten = pathname.slice("/staging".length) || "/app";
    const url = request.nextUrl.clone();
    url.pathname = rewritten;
    const res = NextResponse.redirect(url);
    res.cookies.set(RUNTIME_MODE_COOKIE, "staging", {
      path: "/",
      maxAge: RUNTIME_MODE_COOKIE_TTL,
      sameSite: "lax",
    });
    return res;
  }

  // ── Auth gate for /app + /admin ───────────────────────────────────
  const hasCookie = request.cookies.has(SESSION_COOKIE);
  const isProtected =
    pathname.startsWith("/app") || pathname.startsWith("/admin");

  if (isProtected && !hasCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/staging/:path*",
    "/staging",
  ],
};
