import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, BookOpen } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { pageMetadata } from "@/lib/seo";
import { GUIDES, guidesByCategory } from "./content";

export const metadata: Metadata = pageMetadata({
  title: "Οδηγοί & Βοήθεια — Ηλεκτρονική Τιμολόγηση myDATA",
  description:
    "Πλήρες κέντρο βοήθειας: οδηγοί βήμα-βήμα για εγγραφή, ενεργοποίηση παρόχου, έκδοση παραστατικών, πιστωτικά, πληρωμές, POS και διαχείριση σφαλμάτων myDATA. Λήψη PDF διαθέσιμη σε κάθε οδηγό.",
  path: "/guides",
  keywords: [
    "οδηγοί τιμολόγιον",
    "βοήθεια myDATA",
    "πώς να εκδώσω τιμολόγιο",
    "οδηγός ΑΑΔΕ",
    "εγχειρίδιο χρήσης τιμολόγιον",
    "documentation timologion",
    "συχνές ερωτήσεις τιμολόγηση",
  ],
});

export default function GuidesPage() {
  const grouped = guidesByCategory();
  return (
    <>
      <section className="bg-brand-900 text-white">
        <Container className="py-24 md:py-36">
          <p className="eyebrow inline-flex items-center gap-2 text-white/60">
            <BookOpen size={14} strokeWidth={2.5} aria-hidden />
            Οδηγοί & Βοήθεια
          </p>
          <h1 className="text-hero mt-8 max-w-4xl">
            Πρακτικοί οδηγοί για κάθε βήμα.
          </h1>
          <p className="mt-8 max-w-3xl text-lg text-white/70 md:text-xl">
            {GUIDES.length} σύντομοι οδηγοί που καλύπτουν όλα όσα χρειάζεσαι
            — από την εγγραφή μέχρι πιστωτικά, POS και διαχείριση σφαλμάτων.
            Κάθε οδηγός διαρκεί λίγα λεπτά και μπορεί να αποθηκευτεί ως PDF.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex h-14 items-center rounded-full bg-emerald-400 px-7 text-base font-bold text-emerald-950 transition-transform hover:-translate-y-0.5"
            >
              Δωρεάν εγγραφή
              <ArrowRight size={16} className="ml-2" aria-hidden />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-14 items-center rounded-full border-2 border-white/30 px-7 text-base font-bold text-white transition-colors hover:bg-white/10"
            >
              Σύνδεση
            </Link>
          </div>
        </Container>
      </section>

      {/* Grouped by category */}
      <section className="bg-white">
        <Container className="py-20 md:py-28">
          <div className="space-y-16">
            {grouped.map(({ category, items }) => (
              <div key={category}>
                <div className="mb-6 flex items-baseline justify-between border-b-2 border-black/[0.08] pb-3">
                  <h2 className="text-xl font-extrabold text-brand-900 md:text-2xl">
                    {category}
                  </h2>
                  <span className="text-xs font-semibold text-black/50">
                    {items.length}{" "}
                    {items.length === 1 ? "οδηγός" : "οδηγοί"}
                  </span>
                </div>
                <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((g) => (
                    <li key={g.slug}>
                      <Link
                        href={`/guides/${g.slug}`}
                        className="group flex h-full flex-col rounded-2xl border-2 border-black/[0.08] bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-lg"
                      >
                        <div className="flex items-baseline justify-between">
                          <span className="text-3xl font-extrabold tracking-tightest text-brand-900">
                            {g.n}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/50">
                            <Clock size={12} aria-hidden />
                            {g.read}
                          </span>
                        </div>
                        <h3 className="mt-4 text-lg font-extrabold text-brand-900 group-hover:text-brand-800">
                          {g.title}
                        </h3>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-black/70">
                          {g.intro}
                        </p>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-900 opacity-0 transition-opacity group-hover:opacity-100">
                          Άνοιγμα
                          <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Footer help panel */}
          <div className="mt-20 grid gap-4 rounded-3xl border-2 border-black/[0.08] bg-brand-50/40 p-8 md:grid-cols-3 md:gap-8 md:p-10">
            <div className="md:col-span-2">
              <h3 className="text-xl font-extrabold text-brand-900 md:text-2xl">
                Δεν βρήκες αυτό που ψάχνεις;
              </h3>
              <p className="mt-2 text-base text-black/70">
                Στείλε μας μήνυμα με τη συγκεκριμένη ερώτηση — απαντάμε σε
                λιγότερο από μία εργάσιμη ημέρα.
              </p>
            </div>
            <div className="flex items-center md:justify-end">
              <Link
                href="/contact"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-brand-900 px-6 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
              >
                Επικοινωνία
                <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
