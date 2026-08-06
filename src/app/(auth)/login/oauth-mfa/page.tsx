import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  OAUTH_MFA_PENDING_COOKIE,
  verifyOAuthMfaPendingCookie,
} from "@/lib/auth/oauth";
import { OAuthMfaForm } from "./OAuthMfaForm";

export const dynamic = "force-dynamic";

export default async function OAuthMfaPage() {
  const jar = await cookies();
  const pending = verifyOAuthMfaPendingCookie(
    jar.get(OAUTH_MFA_PENDING_COOKIE)?.value,
  );
  if (!pending) {
    // No pending OAuth handshake — nothing to verify. Send the user
    // back to the login page so they can start over.
    redirect("/login");
  }
  return (
    <>
      <h1 className="text-4xl font-extrabold tracking-tightest text-brand-900 md:text-5xl">
        Επιβεβαίωση 2FA
      </h1>
      <p className="mt-4 text-lg text-black/70">
        Στείλαμε 6-ψήφιο κωδικό στο email σου. Δώσ&apos; τον για να ολοκληρώσεις
        τη σύνδεση.
      </p>
      <div className="mt-10">
        <OAuthMfaForm />
      </div>
      <p className="mt-10 text-base text-black/70">
        Θες να ξεκινήσεις από την αρχή;{" "}
        <Link
          href="/login"
          className="font-semibold text-brand-900 underline underline-offset-4 hover:opacity-70"
        >
          Επιστροφή στη σύνδεση
        </Link>
      </p>
    </>
  );
}
