import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Download,
  MessageCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { pageMetadata } from "@/lib/seo";
import { GUIDES } from "./content";
import { GuidesBrowser } from "./GuidesBrowser";

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
  return (
    <>
      {/* Hero */}
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

          {/* Trust bar — 3 quick affordances that answer "what am I getting?" */}
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <HeroBadge
              icon={Search}
              title="Άμεση αναζήτηση"
              body="Πληκτρολόγησε λέξη-κλειδί και βρες τον οδηγό σε δευτερόλεπτα."
            />
            <HeroBadge
              icon={Download}
              title="Λήψη ως PDF"
              body="Κάθε οδηγός εκτυπώνεται καθαρά — αποθήκευσε για offline χρήση."
            />
            <HeroBadge
              icon={MessageCircle}
              title="Υποστήριξη"
              body="Δεν βρήκες αυτό που ψάχνεις; Απαντάμε την ίδια εργάσιμη."
            />
          </div>

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

      {/* Browser — client component with live search + category chips */}
      <section className="bg-white">
        <Container className="py-16 md:py-20">
          <GuidesBrowser guides={GUIDES} />
        </Container>
      </section>

      {/* Suggested first reads — hand-picked "if you're new, start here" */}
      <section className="bg-brand-50/40 border-t-2 border-black/[0.06]">
        <Container className="py-16 md:py-20">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="eyebrow inline-flex items-center gap-2 text-brand-900/70">
                <Sparkles size={13} strokeWidth={2.5} aria-hidden />
                Πρώτη φορά εδώ;
              </p>
              <h2 className="mt-3 text-2xl font-extrabold text-brand-900 md:text-3xl">
                Ξεκίνα από αυτούς
              </h2>
            </div>
            <Link
              href="/guides/start"
              className="inline-flex items-center gap-1 text-sm font-bold text-brand-900 underline underline-offset-4"
            >
              Πλήρης οδηγός εγγραφής
              <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
            </Link>
          </div>

          <ol className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {["start", "activate", "first-invoice", "credit-note"].map(
              (slug, i) => {
                const g = GUIDES.find((x) => x.slug === slug);
                if (!g) return null;
                return (
                  <li key={g.slug}>
                    <Link
                      href={`/guides/${g.slug}`}
                      className="flex h-full flex-col rounded-xl border-2 border-black/10 bg-white p-5 transition-colors hover:border-brand-500"
                    >
                      <span className="text-xs font-black uppercase tracking-widest text-brand-900/50">
                        Βήμα {i + 1}
                      </span>
                      <span className="mt-1 text-sm font-extrabold text-brand-900">
                        {g.title}
                      </span>
                      <span className="mt-2 text-xs text-black/60">
                        {g.read}
                      </span>
                    </Link>
                  </li>
                );
              },
            )}
          </ol>
        </Container>
      </section>

      {/* Footer help panel */}
      <section className="bg-white">
        <Container className="pb-20">
          <div className="grid gap-4 rounded-3xl border-2 border-black/[0.08] bg-brand-50/40 p-8 md:grid-cols-3 md:gap-8 md:p-10">
            <div className="md:col-span-2">
              <h3 className="text-xl font-extrabold text-brand-900 md:text-2xl">
                Δεν βρήκες αυτό που ψάχνεις;
              </h3>
              <p className="mt-2 text-base text-black/70">
                Στείλε μας μήνυμα με τη συγκεκριμένη ερώτηση — απαντάμε σε
                λιγότερο από μία εργάσιμη ημέρα. Ή δες τα ήδη ανοιχτά
                αιτήματα υποστήριξης όταν συνδεθείς.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Link
                href="/contact"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-brand-900 px-6 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
              >
                Επικοινωνία
                <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
              </Link>
              <Link
                href="/app/support"
                className="inline-flex h-12 items-center rounded-full border-2 border-brand-900 px-6 text-sm font-bold text-brand-900 transition-colors hover:bg-brand-900 hover:text-white"
              >
                Άνοιγμα αιτήματος
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

function HeroBadge({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Search;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/[0.04] p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-emerald-300">
        <Icon size={16} strokeWidth={2.5} aria-hidden />
      </span>
      <div>
        <p className="text-sm font-black text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-white/70">{body}</p>
      </div>
    </div>
  );
}
