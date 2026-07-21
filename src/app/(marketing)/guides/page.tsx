import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { GUIDES } from "./content";

export const metadata: Metadata = {
  title: "Οδηγίες · timologion",
  description:
    "Πρακτικοί οδηγοί για εγγραφή, ενεργοποίηση, έκδοση παραστατικών.",
};

export default function GuidesPage() {
  return (
    <>
      <section className="bg-brand-900 text-white">
        <Container className="py-28 md:py-40">
          <p className="eyebrow text-white/60">Οδηγίες</p>
          <h1 className="text-hero mt-8 max-w-4xl">
            Πρακτικοί οδηγοί για κάθε βήμα.
          </h1>
          <p className="mt-8 max-w-3xl text-lg text-white/70 md:text-xl">
            Έξι σύντομοι οδηγοί που καλύπτουν όλα τα βασικά — από την εγγραφή
            μέχρι τη διαχείριση σφαλμάτων έκδοσης. Κάθε οδηγός διαρκεί λιγότερο
            από πέντε λεπτά ανάγνωσης.
          </p>
        </Container>
      </section>

      <section className="bg-white">
        <Container className="py-20 md:py-28">
          <ul className="divide-y-2 divide-black/[0.08] border-y-2 border-black/[0.08]">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guides/${g.slug}`}
                  className="group grid gap-6 py-10 md:py-14 lg:grid-cols-12 lg:gap-10"
                >
                  <div className="lg:col-span-1">
                    <p className="text-5xl font-extrabold tracking-tightest text-brand-900 md:text-6xl">
                      {g.n}
                    </p>
                  </div>
                  <div className="lg:col-span-8">
                    <p className="eyebrow text-black/50">{g.category}</p>
                    <h2 className="mt-3 text-3xl font-bold text-brand-900 transition-opacity group-hover:opacity-70 md:text-4xl">
                      {g.title}
                    </h2>
                    <p className="mt-4 max-w-2xl text-lg text-black/70">
                      {g.intro}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-6 lg:col-span-3 lg:justify-end">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-black/60">
                      <Clock size={14} aria-hidden />
                      {g.read}
                    </span>
                    <span
                      aria-hidden
                      className="grid h-14 w-14 place-items-center rounded-full border-2 border-brand-900 text-brand-900 transition-all group-hover:bg-brand-900 group-hover:text-white"
                    >
                      <ArrowRight size={18} />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}
