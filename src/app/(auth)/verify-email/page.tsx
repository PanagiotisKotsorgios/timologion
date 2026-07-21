import Link from "next/link";
import { CheckCircle2, XCircle, RefreshCcw, LogIn } from "lucide-react";
import { consumeVerificationToken } from "@/lib/auth/email-verify";
import { getSession } from "@/lib/auth/session";
import { ResendButton } from "./ResendButton";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const session = await getSession();

  let outcome: "ok" | "invalid" | "no-token" = "no-token";
  if (token) {
    const userId = await consumeVerificationToken(token);
    outcome = userId ? "ok" : "invalid";
  }

  return (
    <>
      <h1 className="text-4xl font-extrabold tracking-tightest text-brand-900 md:text-5xl">
        {outcome === "ok"
          ? "Επιβεβαιώθηκε"
          : outcome === "invalid"
            ? "Μη έγκυρος σύνδεσμος"
            : "Επιβεβαίωση email"}
      </h1>

      {outcome === "ok" && (
        <>
          <div className="mt-8 flex items-start gap-3 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50 p-5 text-base font-medium text-emerald-800">
            <CheckCircle2 size={22} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Το email σου επιβεβαιώθηκε. Ο λογαριασμός σου είναι πλήρως ενεργός.
            </span>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={session ? "/app" : "/login"}
              className="inline-flex h-14 items-center gap-2 rounded-full bg-brand-900 px-6 text-base font-semibold text-white hover:bg-black"
            >
              <LogIn size={18} aria-hidden />
              {session ? "Στο dashboard" : "Σύνδεση"}
            </Link>
          </div>
        </>
      )}

      {outcome === "invalid" && (
        <>
          <div className="mt-8 flex items-start gap-3 rounded-2xl border-2 border-red-500/30 bg-red-50 p-5 text-base font-medium text-red-800">
            <XCircle size={22} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Ο σύνδεσμος έληξε ή έχει ήδη χρησιμοποιηθεί. Ζήτησε νέο σύνδεσμο
              από τον λογαριασμό σου.
            </span>
          </div>
          {session && (
            <div className="mt-8">
              <ResendButton />
            </div>
          )}
        </>
      )}

      {outcome === "no-token" && (
        <>
          <p className="mt-6 text-lg text-black/70">
            Έλεγξε το inbox σου για το email επιβεβαίωσης. Αν δεν το βρίσκεις,
            μπορείς να ζητήσεις να ξανασταλεί.
          </p>
          {session ? (
            <div className="mt-8">
              <ResendButton />
            </div>
          ) : (
            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex h-14 items-center gap-2 rounded-full border-2 border-brand-900 bg-white px-6 text-base font-semibold text-brand-900 hover:bg-brand-900 hover:text-white"
              >
                <LogIn size={18} aria-hidden />
                Σύνδεση
              </Link>
            </div>
          )}
        </>
      )}
    </>
  );
}
