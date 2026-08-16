import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";

export const metadata: Metadata = pageMetadata({
  title: "Σύνδεση στον Λογαριασμό σου",
  description:
    "Σύνδεση στο Τιμολόγιον — ελληνικό online πρόγραμμα ηλεκτρονικής τιμολόγησης με myDATA. Πρόσβαση στο dashboard, στα παραστατικά και το πελατολόγιο.",
  path: "/login",
  keywords: [
    "σύνδεση τιμολόγιον",
    "login τιμολόγιο",
    "είσοδος myDATA πρόγραμμα",
  ],
});

const OAUTH_ERRORS: Record<string, string> = {
  oauth_disabled: "Η σύνδεση με αυτόν τον πάροχο δεν είναι διαθέσιμη.",
  bad_state: "Λήξη ή μη έγκυρη συνεδρία σύνδεσης — δοκίμασε ξανά.",
  oauth_exchange_failed: "Αποτυχία επικοινωνίας με τον πάροχο.",
  no_email_from_provider:
    "Ο πάροχος δεν επέστρεψε email. Χρησιμοποίησε άλλη μέθοδο.",
  missing_params: "Λείπουν παράμετροι — δοκίμασε ξανά.",
  rate_limited: "Πολλές προσπάθειες. Δοκίμασε ξανά σε λίγο.",
  mfa_send_failed:
    "Δεν καταφέραμε να στείλουμε τον κωδικό 2FA στο email σου. Δοκίμασε ξανά σε λίγο — αν επιμένει, επικοινώνησε με την υποστήριξη.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    reset?: string;
    banned?: string;
    error?: string;
    reason?: string;
  }>;
}) {
  const { reset, banned, error, reason } = await searchParams;
  const oauthError = error ? OAUTH_ERRORS[error] ?? null : null;

  // Only redirect logged-in users to /app when their session is
  // ACTUALLY valid — checking against the DB, not just the cookie.
  // Middleware used to redirect based on cookie presence alone, which
  // caused an infinite loop when the cookie outlived the DB row
  // (see ERR_TOO_MANY_REDIRECTS bug). Now we verify here.
  const session = await getSession();
  if (session) redirect("/app");

  // Friendly hint when the user landed here via /api/logout after a
  // stale session was cleaned up.
  const staleSession = reason === "expired";
  const bannedMidSession = reason === "banned";

  return (
    <>
      <h1 className="text-4xl font-extrabold tracking-tightest text-brand-900 md:text-5xl">
        Σύνδεση
      </h1>
      <p className="mt-4 text-lg text-black/70">
        Καλωσόρισες πίσω. Συνέχισε στο dashboard σου.
      </p>

      {reset === "1" && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Ο κωδικός σου ενημερώθηκε. Μπορείς τώρα να συνδεθείς με τον νέο.
          </span>
        </div>
      )}

      {(banned === "1" || bannedMidSession) && (
        <div className="mt-6 rounded-2xl border-2 border-red-500/30 bg-red-50 p-4 text-sm font-medium text-red-700">
          Ο λογαριασμός σου έχει ανασταλεί. Επικοινώνησε με την υποστήριξη.
        </div>
      )}

      {staleSession && (
        <div className="mt-6 rounded-2xl border-2 border-amber-500/30 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          Η συνεδρία σου έληξε. Συνδέσου ξανά για να συνεχίσεις.
        </div>
      )}

      {oauthError && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border-2 border-red-500/30 bg-red-50 p-4 text-sm font-medium text-red-700">
          <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden />
          <span>{oauthError}</span>
        </div>
      )}

      <div className="mt-10">
        <LoginForm />
        <SocialLoginButtons mode="login" />
      </div>

      <p className="mt-10 text-base text-black/70">
        Δεν έχεις λογαριασμό;{" "}
        <Link
          href="/register"
          className="font-semibold text-brand-900 underline underline-offset-4 hover:opacity-70"
        >
          Δημιουργία λογαριασμού
        </Link>
      </p>
    </>
  );
}
