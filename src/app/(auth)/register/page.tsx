import Link from "next/link";
import { RegisterForm } from "./RegisterForm";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-4xl font-extrabold tracking-tightest text-brand-900 md:text-5xl">
        Δημιουργία λογαριασμού
      </h1>
      <p className="mt-4 text-lg text-black/70">
        Ξεκίνα δωρεάν σε ένα λεπτό. Χωρίς κάρτα, χωρίς δέσμευση.
      </p>

      <div className="mt-10">
        <RegisterForm />
        <SocialLoginButtons mode="register" />
      </div>

      <p className="mt-10 text-base text-black/70">
        Έχεις ήδη λογαριασμό;{" "}
        <Link
          href="/login"
          className="font-semibold text-brand-900 underline underline-offset-4 hover:opacity-70"
        >
          Σύνδεση
        </Link>
      </p>
    </>
  );
}
