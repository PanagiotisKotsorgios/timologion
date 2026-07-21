import type { Metadata } from "next";
import { Container } from "@/components/marketing/Container";

export const metadata: Metadata = {
  title: "Πολιτική απορρήτου · timologion",
  description:
    "Πώς συλλέγουμε, χρησιμοποιούμε και προστατεύουμε τα δεδομένα σου στο timologion. Ενημέρωση σύμφωνα με GDPR.",
};

export default function PrivacyPage() {
  return (
    <>
      <section className="bg-brand-900 text-white">
        <Container size="reading" className="py-24 md:py-32">
          <p className="eyebrow text-white/60">Νομικά</p>
          <h1 className="mt-6 text-5xl font-extrabold tracking-tightest md:text-7xl">
            Πολιτική απορρήτου
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/70">
            Πώς συλλέγουμε, χρησιμοποιούμε και προστατεύουμε τα δεδομένα σου.
            Σύμφωνα με τον Κανονισμό (ΕΕ) 2016/679 (GDPR) και τον Ν. 4624/2019.
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
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="font-bold">Ενημέρωση</p>
            <p className="mt-1">
              Το παρόν κείμενο αποτελεί ενημερωτική περίληψη προς τους χρήστες
              του timologion. Για δεσμευτικούς όρους και ολοκληρωμένη νομική
              κάλυψη, το τελικό κείμενο θα τεθεί σε έλεγχο από νομικό σύμβουλο
              πριν την εμπορική διάθεση.
            </p>
          </div>

          <Section title="1. Υπεύθυνος επεξεργασίας">
            <p>
              Υπεύθυνος επεξεργασίας των προσωπικών σου δεδομένων είναι η
              εταιρεία που λειτουργεί το timologion (εφεξής «εμείς»). Για
              οποιοδήποτε ζήτημα σχετικό με τα δεδομένα σου, επικοινώνησε στη
              διεύθυνση{" "}
              <a
                className="font-semibold text-brand-800 underline"
                href="mailto:privacy@timologion.gr"
              >
                privacy@timologion.gr
              </a>
              .
            </p>
          </Section>

          <Section title="2. Ποια δεδομένα συλλέγουμε">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong>Στοιχεία λογαριασμού:</strong> email, όνομα, κωδικός
                πρόσβασης (αποθηκευμένος με Argon2id — δεν αποθηκεύεται σε
                αναγνώσιμη μορφή).
              </li>
              <li>
                <strong>Στοιχεία επιχείρησης:</strong> ΑΦΜ, ΔΟΥ, επωνυμία,
                δραστηριότητα, έδρα, τηλέφωνο, email επικοινωνίας.
              </li>
              <li>
                <strong>Δεδομένα λειτουργίας:</strong> πελατολόγιο, είδη,
                παραστατικά, πληρωμές, ημερολόγιο ενεργειών (audit log).
              </li>
              <li>
                <strong>Τεχνικά δεδομένα:</strong> διεύθυνση IP, στοιχεία
                browser και συσκευής, timestamps, cookies (βλ. Πολιτική
                Cookies).
              </li>
              <li>
                <strong>Δεδομένα OAuth:</strong> εφόσον συνδεθείς μέσω Google
                ή Facebook, λαμβάνουμε όνομα, email, μοναδικό αναγνωριστικό
                παρόχου — τίποτε παραπάνω.
              </li>
            </ul>
          </Section>

          <Section title="3. Σκοποί επεξεργασίας">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Παροχή της υπηρεσίας ηλεκτρονικής τιμολόγησης.</li>
              <li>
                Διαβίβαση δεδομένων παραστατικών στον συνεργαζόμενο πάροχο{" "}
                <strong>Wrapp</strong> για φοροσήμανση και αναφορά στο myDATA.
              </li>
              <li>
                Επικοινωνία μαζί σου για υπηρεσίες, υποστήριξη και ασφάλεια
                λογαριασμού.
              </li>
              <li>
                Διαχείριση συνδρομών, τιμολόγησης και λογιστικών υποχρεώσεων.
              </li>
              <li>Πρόληψη απάτης, ασφάλεια και αντιμετώπιση κακόβουλης χρήσης.</li>
            </ul>
          </Section>

          <Section title="4. Νομικές βάσεις (άρθρο 6 GDPR)">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong>Εκτέλεση σύμβασης:</strong> για την παροχή της υπηρεσίας
                στην οποία εγγράφεσαι.
              </li>
              <li>
                <strong>Νόμιμη υποχρέωση:</strong> για τα φορολογικά και
                λογιστικά δεδομένα (π.χ. myDATA / ΑΑΔΕ).
              </li>
              <li>
                <strong>Έννομο συμφέρον:</strong> για την ασφάλεια της
                πλατφόρμας και την πρόληψη απάτης.
              </li>
              <li>
                <strong>Συγκατάθεση:</strong> για προαιρετικά cookies και για
                προαιρετική επικοινωνία marketing (μπορείς να την αποσύρεις
                ανά πάσα στιγμή).
              </li>
            </ul>
          </Section>

          <Section title="5. Παραλήπτες δεδομένων">
            <p>
              Τα προσωπικά σου δεδομένα δεν πωλούνται. Ενδέχεται να
              κοινοποιηθούν στους ακόλουθους εκτελούντες την επεξεργασία:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Wrapp:</strong> πιστοποιημένος πάροχος ηλεκτρονικής
                τιμολόγησης — για την έκδοση παραστατικών και διαβίβαση στο
                myDATA.
              </li>
              <li>
                <strong>Brevo:</strong> πάροχος αποστολής transactional emails.
              </li>
              <li>
                <strong>Πάροχος hosting/DB:</strong> για τη λειτουργία της
                εφαρμογής, εντός ΕΕ.
              </li>
              <li>
                <strong>Δημόσιες αρχές:</strong> όταν προβλέπεται από τον νόμο.
              </li>
            </ul>
          </Section>

          <Section title="6. Χρόνος διατήρησης">
            <p>
              Διατηρούμε δεδομένα λογαριασμού όσο διάστημα ο λογαριασμός είναι
              ενεργός. Φορολογικά δεδομένα (παραστατικά, MARK/UID) διατηρούνται
              σύμφωνα με τη φορολογική νομοθεσία (τουλάχιστον 5 έτη). Δεδομένα
              audit και ασφαλείας για έως 24 μήνες. Μετά τη διαγραφή του
              λογαριασμού σου, τα προσωπικά δεδομένα ανωνυμοποιούνται ή
              διαγράφονται, εκτός εάν υφίσταται νόμιμη υποχρέωση διατήρησης.
            </p>
          </Section>

          <Section title="7. Τα δικαιώματά σου">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Πρόσβαση στα δεδομένα σου και λήψη αντιγράφου.</li>
              <li>Διόρθωση ανακριβών ή ελλιπών δεδομένων.</li>
              <li>Διαγραφή (δικαίωμα στη λήθη) όπου εφαρμόζεται.</li>
              <li>Περιορισμός ή εναντίωση στην επεξεργασία.</li>
              <li>Φορητότητα των δεδομένων σου σε μηχαναναγνώσιμη μορφή.</li>
              <li>
                Ανάκληση συγκατάθεσης όπου η επεξεργασία βασίζεται σε αυτήν.
              </li>
              <li>
                Καταγγελία στην{" "}
                <a
                  className="font-semibold text-brand-800 underline"
                  href="https://www.dpa.gr"
                  target="_blank"
                  rel="noreferrer"
                >
                  Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα
                </a>
                .
              </li>
            </ul>
          </Section>

          <Section title="8. Ασφάλεια">
            <p>
              Οι κωδικοί σου κρυπτογραφούνται με Argon2id. Τα ευαίσθητα
              διαπιστευτήρια τρίτων (π.χ. ΓΓΠΣ) αποθηκεύονται με AES-256-GCM. Η
              επικοινωνία γίνεται αποκλειστικά μέσω HTTPS. Διατηρούμε ημερολόγιο
              κρίσιμων ενεργειών (audit log) και εφαρμόζουμε rate limiting σε
              ευαίσθητα endpoints.
            </p>
          </Section>

          <Section title="9. Ανήλικοι">
            <p>
              Η υπηρεσία απευθύνεται σε επιχειρήσεις και επαγγελματίες. Δεν
              απευθύνεται σε ανήλικους κάτω των 16 ετών και δεν συλλέγουμε
              εν γνώσει μας προσωπικά δεδομένα ανηλίκων.
            </p>
          </Section>

          <Section title="10. Αλλαγές">
            <p>
              Ενδέχεται να επικαιροποιήσουμε την Πολιτική. Ουσιώδεις αλλαγές θα
              γνωστοποιούνται μέσω email ή εντός της εφαρμογής τουλάχιστον 15
              ημέρες πριν τεθούν σε ισχύ.
            </p>
          </Section>

          <Section title="11. Επικοινωνία">
            <p>
              Για ερωτήματα σχετικά με προσωπικά δεδομένα:{" "}
              <a
                className="font-semibold text-brand-800 underline"
                href="mailto:privacy@timologion.gr"
              >
                privacy@timologion.gr
              </a>
              . Για υποστήριξη υπηρεσίας:{" "}
              <a
                className="font-semibold text-brand-800 underline"
                href="mailto:support@timologion.gr"
              >
                support@timologion.gr
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
