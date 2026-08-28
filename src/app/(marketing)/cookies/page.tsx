import type { Metadata } from "next";
import { Container } from "@/components/marketing/Container";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Πολιτική Cookies",
  description:
    "Πώς και γιατί χρησιμοποιεί cookies το Τιμολόγιον για τη λειτουργία της ηλεκτρονικής τιμολόγησης και ποιες επιλογές έχεις για τη διαχείρισή τους. Συμμόρφωση με ePrivacy & Ν. 3471/2006.",
  path: "/cookies",
});

const LAST_UPDATED = "03/08/2026";

type CookieRow = {
  name: string;
  provider: string;
  purpose: string;
  duration: string;
  type: "necessary" | "functional";
};

const COOKIES: CookieRow[] = [
  {
    name: "session",
    provider: "timologion.gr",
    purpose:
      "Διατηρεί τη σύνδεση του χρήστη μετά το login. Απαραίτητο για τη λειτουργία της εφαρμογής.",
    duration: "Σύνοδος ή έως 30 μέρες με «Να με θυμάσαι»",
    type: "necessary",
  },
  {
    name: "csrf",
    provider: "timologion.gr",
    purpose:
      "Προστασία από επιθέσεις cross-site request forgery. Επικυρώνει ότι οι υποβολές φορμών προέρχονται από τη νόμιμη σελίδα.",
    duration: "Σύνοδος",
    type: "necessary",
  },
  {
    name: "locale",
    provider: "timologion.gr",
    purpose:
      "Θυμάται την προτίμηση γλώσσας του χρήστη (ελληνικά / αγγλικά).",
    duration: "1 έτος",
    type: "functional",
  },
  {
    name: "cookieConsent",
    provider: "timologion.gr",
    purpose:
      "Αποθηκεύει την επιλογή του χρήστη σχετικά με τη χρήση cookies ώστε να μην ρωτάμε ξανά.",
    duration: "12 μήνες",
    type: "necessary",
  },
];

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
            Πώς και γιατί χρησιμοποιούμε cookies και παρόμοιες τεχνολογίες.
            Σε συμμόρφωση με την Οδηγία ePrivacy 2002/58/EΚ, τον Ν.
            3471/2006 και τον GDPR.
          </p>
          <p className="mt-6 text-sm text-white/50">
            Τελευταία ενημέρωση: {LAST_UPDATED}
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
              Τα cookies είναι μικρά αρχεία κειμένου που ένας ιστότοπος
              αποθηκεύει στη συσκευή σου (browser) όταν τον επισκέπτεσαι.
              Χρησιμοποιούνται για να θυμάται προτιμήσεις, να διατηρεί
              συνόδους σύνδεσης και να καταλαβαίνει πώς χρησιμοποιείται μια
              υπηρεσία.
            </p>
            <p className="mt-3">
              Ο όρος «cookies» στην παρούσα πολιτική περιλαμβάνει και
              παρόμοιες τεχνολογίες όπως local storage και session storage.
            </p>
          </Section>

          <Section title="2. Κατηγορίες cookies που χρησιμοποιούμε">
            <p>
              Χρησιμοποιούμε <strong>μόνο</strong> τεχνικά αναγκαία και
              λειτουργικά cookies. <strong>Δεν χρησιμοποιούμε</strong>{" "}
              cookies τρίτων για διαφήμιση, remarketing, tracking ή
              analytics.
            </p>

            <h3 className="mt-6 text-lg font-bold text-brand-900">
              2.1 Αυστηρώς αναγκαία (strictly necessary)
            </h3>
            <p className="mt-2">
              Απαιτούνται για τη βασική λειτουργία της εφαρμογής και δεν
              χρειάζονται συγκατάθεση (Άρθρο 4 παρ. 5 Ν. 3471/2006). Χωρίς
              αυτά δεν μπορείς να συνδεθείς ή να υποβάλλεις φόρμες.
            </p>

            <h3 className="mt-6 text-lg font-bold text-brand-900">
              2.2 Λειτουργικά (functional)
            </h3>
            <p className="mt-2">
              Βελτιώνουν την εμπειρία χρήσης θυμούμενα προτιμήσεις (γλώσσα,
              τη σελίδα που είδες τελευταία). Αποθηκεύονται μόνο μετά από
              συγκατάθεση όπου το επιβάλλει ο νόμος.
            </p>
          </Section>

          <Section title="3. Λεπτομερής πίνακας cookies">
            <div className="mt-6 overflow-x-auto rounded-2xl border-2 border-black/10">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-brand-50/60">
                  <tr>
                    <th className="px-4 py-3 text-brand-900">Όνομα</th>
                    <th className="px-4 py-3 text-brand-900">Πάροχος</th>
                    <th className="px-4 py-3 text-brand-900">Σκοπός</th>
                    <th className="px-4 py-3 text-brand-900">Διάρκεια</th>
                    <th className="px-4 py-3 text-brand-900">Τύπος</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  {COOKIES.map((c) => (
                    <tr key={c.name}>
                      <td className="px-4 py-3 mono font-semibold">
                        {c.name}
                      </td>
                      <td className="px-4 py-3 text-black/70">
                        {c.provider}
                      </td>
                      <td className="px-4 py-3 text-black/70">
                        {c.purpose}
                      </td>
                      <td className="px-4 py-3 text-black/70">
                        {c.duration}
                      </td>
                      <td className="px-4 py-3">
                        {c.type === "necessary" ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black uppercase tracking-widest text-emerald-800">
                            Αναγκαίο
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black uppercase tracking-widest text-amber-800">
                            Λειτουργικό
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="4. Cookies τρίτων">
            <p>Δεν χρησιμοποιούμε cookies τρίτων παρόχων.</p>
            <p className="mt-3">
              Εξαίρεση: όταν επιλέξεις να συνδεθείς μέσω Google ή Facebook
              (OAuth), αυτοί οι πάροχοι μπορεί να ορίσουν δικά τους cookies
              στους τομείς τους (όχι στο timologion.gr) σύμφωνα με τις
              δικές τους πολιτικές. Δεν έχουμε πρόσβαση σε αυτά.
            </p>
          </Section>

          <Section title="5. Συγκατάθεση & διαχείριση">
            <p>
              Την πρώτη φορά που επισκέπτεσαι την ιστοσελίδα σου εμφανίζεται
              ενημερωτικό banner. Μπορείς:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Να αποδεχθείς μόνο τα αναγκαία (default συμπεριφορά αν
                κλείσεις το banner).
              </li>
              <li>Να αποδεχθείς όλα (αναγκαία + λειτουργικά).</li>
            </ul>
            <p className="mt-3">
              Μπορείς να ανακαλέσεις τη συγκατάθεση οποιαδήποτε στιγμή
              καθαρίζοντας τα cookies του browser ή στέλνοντας email στο{" "}
              <a
                className="font-semibold text-brand-800 underline"
                href="mailto:support@timologion.gr"
              >
                support@timologion.gr
              </a>
              .
            </p>
          </Section>

          <Section title="6. Πώς απενεργοποιείς cookies">
            <p>
              Όλοι οι σύγχρονοι browsers σου επιτρέπουν να δεις, να
              διαγράψεις ή να αποκλείσεις cookies. Οδηγοί:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <a
                  href="https://support.google.com/chrome/answer/95647"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand-800 underline"
                >
                  Google Chrome
                </a>
              </li>
              <li>
                <a
                  href="https://support.mozilla.org/kb/cookies-information-websites-store-on-your-computer"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand-800 underline"
                >
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a
                  href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand-800 underline"
                >
                  Safari
                </a>
              </li>
              <li>
                <a
                  href="https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand-800 underline"
                >
                  Microsoft Edge
                </a>
              </li>
            </ul>
            <p className="mt-3 text-sm text-black/60">
              Σημείωση: η απενεργοποίηση των αυστηρώς αναγκαίων cookies θα
              αποτρέψει τη σύνδεση στην εφαρμογή.
            </p>
          </Section>

          <Section title="7. Do Not Track">
            <p>
              Δεν έχουμε mechanism για διαφημιστικό tracking, οπότε το
              σήμα «Do Not Track» δεν παίζει ρόλο στην ιστοσελίδα μας — τα
              cookies που θέτουμε είναι είτε αναγκαία είτε λειτουργικά με
              συγκατάθεση.
            </p>
          </Section>

          <Section title="8. Νομική βάση">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong>Αυστηρώς αναγκαία cookies</strong>: εννόμα συμφέρον
                (Άρθρο 6(1)(στ) GDPR) — απαραίτητα για την παροχή της
                υπηρεσίας.
              </li>
              <li>
                <strong>Λειτουργικά cookies</strong>: συγκατάθεση (Άρθρο
                6(1)(α) GDPR & Άρθρο 4 παρ. 5 Ν. 3471/2006).
              </li>
            </ul>
          </Section>

          <Section title="9. Αλλαγές στην πολιτική">
            <p>
              Ενδέχεται να ενημερώσουμε την παρούσα πολιτική. Ουσιώδεις
              αλλαγές γνωστοποιούνται με email τουλάχιστον 15 ημέρες πριν
              την εφαρμογή τους.
            </p>
          </Section>

          <Section title="10. Επικοινωνία">
            <p>
              Για ερωτήσεις σχετικά με τα cookies ή την προστασία δεδομένων:{" "}
              <a
                className="font-semibold text-brand-800 underline"
                href="mailto:support@timologion.gr"
              >
                support@timologion.gr
              </a>
              , +30 2631 028 971.
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
