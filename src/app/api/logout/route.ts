import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { env } from "@/lib/env";

/**
 * Cookie-clearing logout route.
 *
 * Server Components in Next 15 can't mutate cookies during render, so
 * whenever a page-level flow needs to invalidate a session (expired,
 * banned mid-session, etc.), it MUST redirect here instead of trying
 * to call `jar.delete()` inline. This route:
 *
 *   1. Deletes the session's DB row (if the cookie still resolves).
 *   2. Clears the browser cookie.
 *   3. Redirects to /login with an optional `?reason=<code>` hint so the
 *      login page can show a friendly banner ("η συνεδρία σου έληξε").
 *
 * Accepts GET so a plain `redirect("/api/logout")` from RSC works.
 * Never a security concern because a logged-in user hitting this URL
 * ends up logged out — the intended outcome.
 */
async function handle(req: Request) {
  const url = new URL(req.url);
  const reason = url.searchParams.get("reason") ?? "";
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
  }
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  const redirectUrl = new URL("/login", req.url);
  if (reason) redirectUrl.searchParams.set("reason", reason);
  return NextResponse.redirect(redirectUrl);
}

export const GET = handle;
export const POST = handle;
