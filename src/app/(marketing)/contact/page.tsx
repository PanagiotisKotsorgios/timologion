import type { Metadata } from "next";
import { Container } from "@/components/marketing/Container";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Επικοινωνία · timologion",
  description:
    "Επικοινώνησε με την ομάδα του timologion για ερωτήσεις, υποστήριξη ή συνεργασία.",
};

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
                  <Channel
                    label="Email υποστήριξης"
                    value="support@timologion.gr"
                  />
                  <Channel
                    label="Συνεργασίες"
                    value="partners@timologion.gr"
                  />
                  <Channel
                    label="Νομικά / privacy"
                    value="privacy@timologion.gr"
                  />
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
    </>
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
