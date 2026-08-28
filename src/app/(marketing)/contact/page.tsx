import type { Metadata } from "next";
import { Container } from "@/components/marketing/Container";
import { pageMetadata } from "@/lib/seo";
import { ContactForm } from "./ContactForm";
import { FeedbackForm } from "./FeedbackForm";

export const metadata: Metadata = pageMetadata({
  title: "Επικοινωνία & Υποστήριξη",
  description:
    "Χρειάζεσαι βοήθεια με το Τιμολόγιον; Στείλε μας μήνυμα στο support@timologion.gr ή τηλεφώνησε. Απαντάμε την ίδια εργάσιμη ημέρα — από άνθρωπο, όχι από bot.",
  path: "/contact",
  keywords: [
    "επικοινωνία τιμολόγιον",
    "υποστήριξη τιμολόγηση",
    "support τιμολόγιο",
    "τηλέφωνο τιμολόγιον",
  ],
});

export default function ContactPage() {
  return (
    <>
      <section className="bg-brand-900 text-white">
        <Container className="py-28 md:py-40">
          <p className="eyebrow text-white/60">Επικοινωνία</p>
          <h1 className="text-hero mt-8 max-w-4xl">
            Είμαστε εδώ για κάθε ερώτηση.
          </h1>
          <p className="mt-10 max-w-2xl text-xl text-white/70 md:text-2xl">
            Στείλε μας μήνυμα και θα σου απαντήσουμε την ίδια εργάσιμη μέρα —
            από άνθρωπο, όχι από bot.
          </p>
        </Container>
      </section>

      <section className="bg-white">
        <Container className="py-24 md:py-32">
          <div className="grid gap-16 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="rounded-3xl border-2 border-black/10 p-10">
                <p className="eyebrow text-brand-900/70">Υποστήριξη</p>
                <p className="mt-4 text-2xl font-bold text-brand-900">
                  Δευτέρα – Παρασκευή
                </p>
                <p className="mt-1 text-base text-black/60">
                  09:00 – 18:00 (EET)
                </p>

                <div className="mt-10 space-y-8">
                  <Channel label="Email" value="support@timologion.gr" />
                  <Channel label="Τηλέφωνο" value="+30 2631 028 971" />
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="rounded-3xl border-2 border-black/10 p-8 md:p-12">
                <h2 className="text-headline text-brand-900">Στείλε μήνυμα.</h2>
                <p className="mt-4 text-lg text-black/70">
                  Θα ανταποκριθούμε το πολύ σε μία εργάσιμη ημέρα.
                </p>
                <div className="mt-10">
                  <ContactForm />
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section id="feedback" className="bg-brand-900 text-white">
        <Container className="py-24 md:py-32">
          <div className="max-w-4xl">
            <p className="eyebrow text-white/60">Ανατροφοδότηση</p>
            <h2 className="text-headline mt-8">
              Ανέφερε πρόβλημα ή πρότεινε χαρακτηριστικό.
            </h2>
            <p className="mt-6 max-w-3xl text-lg text-white/70">
              Το Τιμολόγιον χτίζεται με τη βοήθειά σου. Πες μας τι δεν
              δουλεύει σωστά ή τι θα ήθελες να προστεθεί — κάθε αναφορά
              διαβάζεται και ιεραρχείται.
            </p>

            <ul className="mt-10 grid gap-4 text-base text-white/80 md:grid-cols-3">
              <FeedbackPerk>
                Απάντηση εντός μιας εργάσιμης ημέρας από την ομάδα
                ανάπτυξης
              </FeedbackPerk>
              <FeedbackPerk>
                Bugs με blocker σοβαρότητα προτεραιοποιούνται άμεσα
              </FeedbackPerk>
              <FeedbackPerk>
                Οι προτάσεις που μαζεύουν ζήτηση μπαίνουν στο roadmap
              </FeedbackPerk>
            </ul>
          </div>

          <div className="mt-14 rounded-3xl bg-white p-8 text-black shadow-2xl md:mt-16 md:p-12">
            <FeedbackForm />
          </div>
        </Container>
      </section>
    </>
  );
}

function FeedbackPerk({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className="mt-1.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-brand-900"
      >
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
          <path
            d="M5 12l5 5L20 7"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}

function Channel({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow text-black/50">{label}</p>
      <p className="mt-2 text-xl font-bold text-brand-900">{value}</p>
    </div>
  );
}
