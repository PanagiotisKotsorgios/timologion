import Link from "next/link";
import { ForgotForm } from "./ForgotForm";

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-4xl font-extrabold tracking-tightest text-brand-900 md:text-5xl">
        Ξέχασες τον κωδικό;
      </h1>
      <p className="mt-4 text-lg text-black/70">
        Δώσε το email με το οποίο συνδέεσαι και θα σου στείλουμε σύνδεσμο για
        να ορίσεις νέο κωδικό.
      </p>

      <div className="mt-10">
        <ForgotForm />
      </div>

      <p className="mt-10 text-base text-black/70">
        Θυμήθηκες τον κωδικό;{" "}
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
