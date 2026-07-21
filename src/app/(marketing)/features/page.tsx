import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/marketing/Container";

export const metadata: Metadata = {
  title: "Χαρακτηριστικά · timologion",
  description:
    "Παραστατικά, πελατολόγιο, POS, CRM, αναφορές — όλα σε ένα καθαρό dashboard.",
};

const MODULES: {
  id: string;
  index: string;
  title: string;
  intro: string;
  bullets: string[];
}[] = [
  {
    id: "documents",
    index: "01",
    title: "Παραστατικά",
    intro:
      "Όλοι οι τύποι παραστατικών που χρειάζεσαι, σε μία απλή φόρμα με έξυπνες προεπιλογές.",
    bullets: [
      "Τιμολόγια πώλησης και παροχής υπηρεσιών",
      "Αποδείξεις λιανικής και υπηρεσιών",
      "Πιστωτικά, προτιμολόγια, προσφορές",
      "Δελτία αποστολής και παραγγελίες",
      "Επαναλαμβανόμενα παραστατικά",
      "PDF και θερμική εκτύπωση",
    ],
  },
  {
    id: "clients",
    index: "02",
    title: "Πελατολόγιο",
    intro:
      "Ένα κεντρικό μέρος για όλους τους πελάτες σου, με ιστορικό, υπόλοιπα και σημειώσεις.",
    bullets: [
      "Γρήγορη προσθήκη με αναζήτηση ΑΦΜ",
      "Επαφές, τηλέφωνα, emails",
      "Υπόλοιπο, παραστατικά, πληρωμές",
      "Ετικέτες και ομαδοποιήσεις",
      "Εξαγωγή σε Excel",
    ],
  },
  {
    id: "items",
    index: "03",
    title: "Είδη & Υπηρεσίες",
    intro:
      "Κατάλογος με τιμές, μονάδες και ΦΠΑ — έτοιμος να μπει σε κάθε παραστατικό.",
    bullets: [
      "Υπηρεσίες και προϊόντα σε ένα σημείο",
      "Κωδικός, μονάδα, ΦΠΑ, περιγραφή",
      "Παρακολούθηση αποθέματος (προαιρετικά)",
      "Ζώνες τιμών (προαιρετικά)",
      "Μαζική εισαγωγή/εξαγωγή",
    ],
  },
  {
    id: "payments",
    index: "04",
    title: "Πληρωμές & Εισπράξεις",
    intro:
      "Χρέωση, εξόφληση, μερικές πληρωμές, όλα συνδεδεμένα με τα παραστατικά.",
    bullets: [
      "Χαρακτηρισμός ως εξοφλημένο",
      "Μερικές πληρωμές και υπόλοιπα",
      "Τραπεζικές μεταφορές",
      "Ιστορικό εισπράξεων ανά πελάτη",
    ],
  },
  {
    id: "pos",
    index: "05",
    title: "POS & Γρήγορη Πώληση",
    intro:
      "Για κατάστημα ή εστιατόριο: γρήγορη πώληση, ανοιχτά τραπέζια, θερμική εκτύπωση.",
    bullets: [
      "Γρήγορη πώληση σε ένα κλικ",
      "Διαχείριση τραπεζιών και παραγγελιών",
      "Θερμικές αποδείξεις σε εκτυπωτή 80mm",
      "Υποστήριξη Soft POS / EFT (σε επόμενη φάση)",
    ],
  },
  {
    id: "crm",
    index: "06",
    title: "CRM & Marketing",
    intro:
      "Leads, ευκαιρίες, εργασίες follow-up και επικοινωνία πελατών — χωρίς άλλο εργαλείο.",
    bullets: [
      "Leads και ευκαιρίες με 5 στάδια pipeline",
      "Εργασίες με ημερομηνία λήξης & υπενθυμίσεις",
      "Ιστορικό επικοινωνίας ανά πελάτη",
      "Καμπάνιες email σε προχωρημένα πακέτα (σε επόμενη φάση)",
    ],
  },
  {
    id: "reports",
    index: "07",
    title: "Αναφορές & Στατιστικά",
    intro:
      "Δες τι δουλεύει και τι όχι, με απλά νούμερα και εξαγωγές για τον λογιστή σου.",
    bullets: [
      "Έσοδα, ανεξόφλητα, ΦΠΑ",
      "Top πελάτες και είδη",
      "Εξαγωγή σε Excel / CSV",
      "Προχωρημένα stats σε πακέτα Advanced",
    ],
  },
  {
    id: "team",
    index: "08",
    title: "Ομάδα & Ρόλοι",
    intro:
      "Πρόσθεσε συνεργάτες με τα σωστά δικαιώματα και δες ποιος έκανε τι.",
    bullets: [
      "Ρόλοι owner, admin, λογιστής, πωλητής, staff, readonly",
      "Πολλαπλές επιχειρήσεις σε έναν λογαριασμό",
      "Audit log για κρίσιμες ενέργειες",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="bg-brand-900 text-white">
        <Container className="py-28 md:py-40">
          <p className="eyebrow text-white/60">Χαρακτηριστικά</p>
          <h1 className="text-hero mt-8 max-w-4xl">
            Ένα εργαλείο για κάθε στιγμή της επιχείρησής σου.
          </h1>
          <p className="mt-10 max-w-2xl text-xl text-white/70 md:text-2xl">
            Το timologion συγκεντρώνει όσα χρειάζεσαι για τιμολόγηση,
            οργάνωση και οικονομική εικόνα σε ένα καθαρό dashboard.
          </p>
          <div className="mt-12">
            <Link
              href="/register"
              className="inline-flex h-16 items-center rounded-full bg-white px-10 text-lg font-semibold text-brand-900 transition-transform hover:-translate-y-0.5"
            >
              Ξεκίνα δωρεάν
            </Link>
          </div>
        </Container>
      </section>

      <section className="bg-white">
        <Container className="py-24 md:py-36">
          <div className="space-y-24 md:space-y-28">
            {MODULES.map((m, i) => (
              <article
                key={m.id}
                id={m.id}
                className={`grid gap-10 lg:grid-cols-12 lg:gap-16 ${
                  i % 2 ? "lg:grid-flow-dense" : ""
                }`}
              >
                <div
                  className={`lg:col-span-2 ${i % 2 ? "lg:col-start-11" : ""}`}
                >
                  <p className="text-6xl font-extrabold tracking-tightest text-brand-900 md:text-7xl">
                    {m.index}
                  </p>
                </div>
                <div
                  className={`lg:col-span-6 ${i % 2 ? "lg:col-start-3" : ""}`}
                >
                  <h2 className="text-headline text-brand-900">{m.title}</h2>
                  <p className="mt-6 text-xl leading-relaxed text-black/70 md:text-2xl">
                    {m.intro}
                  </p>
                </div>
                <div
                  className={`lg:col-span-4 ${
                    i % 2 ? "lg:col-start-9 lg:row-start-1" : ""
                  }`}
                >
                  <ul className="space-y-4 border-l-2 border-brand-900 pl-8">
                    {m.bullets.map((b) => (
                      <li
                        key={b}
                        className="text-lg font-medium text-black"
                      >
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-black/[0.08] bg-white">
        <Container className="py-24 md:py-32 text-center">
          <h2 className="text-display mx-auto max-w-3xl text-brand-900">
            Δοκίμασε τα όλα — δωρεάν.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-xl text-black/70">
            Δεκατέσσερις ημέρες χωρίς κάρτα και χωρίς δέσμευση.
          </p>
          <div className="mt-12">
            <Link
              href="/register"
              className="inline-flex h-16 items-center rounded-full bg-brand-900 px-10 text-lg font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              Ξεκίνα δωρεάν
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
