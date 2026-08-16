import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

// Cookie / header names duplicated from src/lib/runtime-mode.ts because
// middleware can't import server-only modules (that file uses next/headers
// and is marked "server-only"). Kept in sync by convention.
const RUNTIME_MODE_COOKIE = "timologion-mode";
const RUNTIME_MODE_HEADER = "x-timologion-mode";
// 7 days — long enough that a QA session doesn't get flipped mid-way,
// short enough that a shared browser doesn't stay in staging forever.
const RUNTIME_MODE_COOKIE_TTL = 7 * 24 * 60 * 60;

/**
 * Middleware does three jobs:
 *
 *   1. /staging       → set the runtime-mode cookie to "staging" and
 *                       redirect to /app so subsequent Wrapp calls hit
 *                       https://staging.wrapp.ai/api/v1.
 *      /staging/exit  → clear the cookie and redirect to /app.
 *
 *   2. Propagate the runtime-mode cookie into a per-request header
 *      so server components can read it via `getRuntimeMode()` without
 *      re-parsing the cookie on every render.
 *
 *   3. Bounce clearly-unauthenticated users out of /app + /admin
 *      (existing behaviour).
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

  // Anything under /staging (including the bare /staging landing page
  // itself, which is a real Next.js route) sets the cookie ONCE on
  // first visit. The bare /staging landing page then explains what
  // staging mode does; deep-links like /staging/app/documents/new
  // strip the prefix and redirect so the normal /app UI kicks in with
  // the cookie already set.
  if (pathname === "/staging" || pathname === "/staging/") {
    // Let the /staging page render normally, but ensure the cookie is
    // set so any Wrapp call on that page's server render already knows.
    const res = NextResponse.next({
      request: {
        headers: appendModeHeader(request.headers, "staging"),
      },
    });
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

  // ── Auth gate + mode header propagation for every other route ─────
  const hasCookie = request.cookies.has(SESSION_COOKIE);
  const modeCookie = request.cookies.get(RUNTIME_MODE_COOKIE)?.value;
  const mode = modeCookie === "staging" ? "staging" : "production";

  const isProtected =
    pathname.startsWith("/app") || pathname.startsWith("/admin");

  if (isProtected && !hasCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if ((pathname === "/login" || pathname === "/register") && hasCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({
    request: {
      headers: appendModeHeader(request.headers, mode),
    },
  });
}

function appendModeHeader(
  incoming: Headers,
  mode: "production" | "staging",
): Headers {
  const h = new Headers(incoming);
  h.set(RUNTIME_MODE_HEADER, mode);
  return h;
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
