import Link from "next/link";
import { ResetForm } from "./ResetForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <>
        <h1 className="text-4xl font-extrabold tracking-tightest text-brand-900 md:text-5xl">
          Λείπει ο σύνδεσμος
        </h1>
        <p className="mt-4 text-lg text-black/70">
          Ο σύνδεσμος επαναφοράς δεν φαίνεται πλήρης. Επίσκεψου ξανά τον
          σύνδεσμο που έλαβες με email.
        </p>
        <p className="mt-10 text-base text-black/70">
          <Link
            href="/forgot-password"
            className="font-semibold text-brand-900 underline underline-offset-4 hover:opacity-70"
          >
            Ζήτησε νέο σύνδεσμο επαναφοράς
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-4xl font-extrabold tracking-tightest text-brand-900 md:text-5xl">
        Ορισμός νέου κωδικού
      </h1>
      <p className="mt-4 text-lg text-black/70">
        Επίλεξε έναν κωδικό τουλάχιστον 8 χαρακτήρων. Θα αποσυνδεθείς αυτόματα
        από όλες τις άλλες συσκευές.
      </p>

      <div className="mt-10">
        <ResetForm token={token} />
      </div>

      <p className="mt-10 text-base text-black/70">
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
