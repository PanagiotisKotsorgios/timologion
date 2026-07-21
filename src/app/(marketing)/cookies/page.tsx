import type { Metadata } from "next";
import { Container } from "@/components/marketing/Container";

export const metadata: Metadata = {
  title: "Πολιτική Cookies · timologion",
  description:
    "Πώς και γιατί χρησιμοποιούμε cookies στο timologion και ποιες επιλογές έχεις.",
};

export default function CookiesPage() {
  return (
    <>
      <section className="bg-brand-900 text-white">
        <Container size="reading" className="py-24 md:py-32">
          <p className="eyebrow text-white/60">Νομικά</p>
          <h1 className="mt-6 text-5xl font-extrabold tracking-tightest md:text-7xl">
            Πολιτική Cookies
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/70">
            Τι είναι τα cookies και πώς τα χρησιμοποιούμε στο timologion.
          </p>
          <p className="mt-6 text-sm text-white/50">
            Τελευταία ενημέρωση: {new Date().toLocaleDateString("el-GR")}
          </p>
        </Container>
      </section>

      <section className="bg-white">
        <Container
          size="reading"
          className="py-20 md:py-24 space-y-14 text-black"
        >
          <Section title="1. Τι είναι τα cookies">
            <p>
              Τα cookies είναι μικρά αρχεία κειμένου που αποθηκεύονται στη
              συσκευή σου όταν επισκέπτεσαι έναν ιστότοπο. Χρησιμοποιούνται για
              τη λειτουργία, την ασφάλεια και τη βελτίωση της εμπειρίας σου.
            </p>
          </Section>

          <Section title="2. Ποια cookies χρησιμοποιούμε">
            <p>Διακρίνονται σε τρεις κατηγορίες:</p>
            <div className="mt-4 space-y-4">
              <CookieBlock
                title="Απαραίτητα cookies"
                required
                items={[
                  {
                    name: "etl_session",
                    purpose:
                      "Διατηρεί τη σύνδεσή σου (session). Χωρίς αυτό δεν λειτουργεί η εφαρμογή.",
                    duration: "12 ώρες / 30 ημέρες (remember me)",
                  },
                  {
                    name: "etl_cookie_consent",
                    purpose:
                      "Αποθηκεύει την επιλογή σου για τα cookies και εμποδίζει την επανεμφάνιση του banner.",
                    duration: "6 μήνες",
                  },
                  {
                    name: "etl_oauth_state",
                    purpose:
                      "Προστασία CSRF κατά τη σύνδεση με Google/Facebook.",
                    duration: "10 λεπτά",
                  },
                ]}
              />
              <CookieBlock
                title="Cookies λειτουργικότητας"
                required={false}
                items={[
                  {
                    name: "etl_admin_return",
                    purpose:
                      "Επιτρέπει σε προσωπικό υποστήριξης να επιστρέψει από impersonation στον δικό του λογαριασμό.",
                    duration: "Συνεδρία",
                  },
                ]}
              />
              <CookieBlock
                title="Cookies ανάλυσης / marketing"
                required={false}
                items={[
                  {
                    name: "—",
                    purpose:
                      "Δεν χρησιμοποιούμε cookies τρίτων για ανάλυση ή διαφήμιση στην τρέχουσα έκδοση.",
                    duration: "—",
                  },
                ]}
              />
            </div>
          </Section>

          <Section title="3. Οι επιλογές σου">
            <p>
              Την πρώτη φορά που επισκέπτεσαι τον ιστότοπο, εμφανίζεται banner με
              επιλογές «Αποδέχομαι όλα» ή «Μόνο απαραίτητα». Την επιλογή σου
              μπορείς να την αλλάξεις κάθε στιγμή διαγράφοντας το cookie{" "}
              <code>etl_cookie_consent</code> από τις ρυθμίσεις του browser σου.
            </p>
            <p className="mt-3">
              Τα απαραίτητα cookies δεν μπορούν να απενεργοποιηθούν καθώς είναι
              απαραίτητα για τη σύνδεση και τη λειτουργία της εφαρμογής.
            </p>
          </Section>

          <Section title="4. Cookies τρίτων">
            <p>
              Το login μέσω Google και Facebook μπορεί να προκαλέσει τη δημιουργία
              cookies από τους αντίστοιχους παρόχους κατά τη διάρκεια της
              διαδικασίας εξουσιοδότησης. Δες τις αντίστοιχες πολιτικές
              απορρήτου τους για λεπτομέρειες.
            </p>
          </Section>

          <Section title="5. Επικοινωνία">
            <p>
              Ερωτήσεις για την πολιτική cookies:{" "}
              <a
                className="font-semibold text-brand-800 underline"
                href="mailto:privacy@timologion.gr"
              >
                privacy@timologion.gr
              </a>
              .
            </p>
          </Section>
        </Container>
      </section>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-brand-900 md:text-3xl">
        {title}
      </h2>
      <div className="mt-4 text-base leading-relaxed text-black/80 md:text-lg">
        {children}
      </div>
    </div>
  );
}

function CookieBlock({
  title,
  required,
  items,
}: {
  title: string;
  required: boolean;
  items: { name: string; purpose: string; duration: string }[];
}) {
  return (
    <div className="rounded-2xl border-2 border-ink-200 bg-ink-50 p-5">
      <div className="flex items-center gap-3">
        <p className="text-lg font-bold text-brand-900">{title}</p>
        <span
          className={
            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest " +
            (required
              ? "bg-brand-900 text-white"
              : "bg-white text-ink-700 border border-ink-300")
          }
        >
          {required ? "Απαραίτητα" : "Προαιρετικά"}
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-300 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500">
              <th className="py-2 pr-3">Όνομα</th>
              <th className="py-2 pr-3">Σκοπός</th>
              <th className="py-2">Διάρκεια</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b border-ink-200 last:border-b-0">
                <td className="py-2 pr-3 font-mono text-xs text-brand-900">
                  {it.name}
                </td>
                <td className="py-2 pr-3 text-ink-900">{it.purpose}</td>
                <td className="py-2 text-ink-700">{it.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
