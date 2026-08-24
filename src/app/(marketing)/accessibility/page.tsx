import type { Metadata } from "next";
import { Container } from "@/components/marketing/Container";
import { pageMetadata } from "@/lib/seo";

/**
 * Δήλωση Προσβασιμότητας. The European Accessibility Act (Οδηγία (ΕΕ)
 * 2019/882, μεταφορά στο ελληνικό δίκαιο με Ν. 5058/2023) φέρνει
 * υποχρέωση προσβασιμότητας WCAG 2.1 AA για ψηφιακές υπηρεσίες προς
 * καταναλωτές από τις 28 Ιουνίου 2025. Δημοσιεύουμε προληπτικά την
 * παρούσα δήλωση για να ενημερώσουμε τους χρήστες για την κατάσταση
 * και το πώς μπορούν να αναφέρουν προβλήματα.
 *
 * Η δήλωση ενημερώνεται κάθε φορά που κάνουμε ουσιώδη αλλαγή στο UI.
 */

export const metadata: Metadata = pageMetadata({
  title: "Δήλωση Προσβασιμότητας",
  description:
    "Το timologion στοχεύει στη συμμόρφωση με τις κατευθυντήριες γραμμές WCAG 2.1 επίπεδο AA, όπως προβλέπει η Ευρωπαϊκή Πράξη Προσβασιμότητας (Οδηγία (ΕΕ) 2019/882, Ν. 5058/2023).",
  path: "/accessibility",
});

const LAST_UPDATED = "24/08/2026";

export default function AccessibilityPage() {
  return (
    <>
      <section className="bg-brand-900 text-white">
        <Container size="reading" className="py-24 md:py-32">
          <p className="eyebrow text-white/60">Νομικά</p>
          <h1 className="mt-6 text-5xl font-extrabold tracking-tightest md:text-7xl">
            Δήλωση Προσβασιμότητας
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/70">
            Δεσμευόμαστε να κάνουμε το timologion προσβάσιμο σε άτομα με
            αναπηρία, σύμφωνα με την Ευρωπαϊκή Πράξη Προσβασιμότητας
            (Οδηγία (ΕΕ) 2019/882) και τις κατευθυντήριες γραμμές WCAG
            2.1 AA.
          </p>
          <p className="mt-6 text-sm text-white/50">
            Τελευταία ενημέρωση: {LAST_UPDATED}
          </p>
        </Container>
      </section>

      <section className="bg-white">
        <Container size="reading" className="py-20 md:py-24 space-y-14 text-black">
          <Section title="1. Πεδίο εφαρμογής">
            <p>
              Η παρούσα δήλωση αφορά τον διαδικτυακό τόπο{" "}
              <strong>timologion.gr</strong> και τη διαδικτυακή εφαρμογή
              που είναι διαθέσιμη μέσω αυτού.
            </p>
          </Section>

          <Section title="2. Κατάσταση συμμόρφωσης">
            <p>
              Ο ιστότοπος σχεδιάζεται με στόχο τη συμμόρφωση με τις
              κατευθυντήριες γραμμές WCAG 2.1 σε επίπεδο <strong>AA</strong>.
              Η συμμόρφωση αξιολογείται εσωτερικά κατά την ανάπτυξη κάθε
              νέας λειτουργίας.
            </p>
            <p className="mt-3">
              <strong>Δηλώσεις εν εξελίξει (μη πλήρης συμμόρφωση):</strong>
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Ορισμένοι πίνακες δεδομένων ενδέχεται να μη διαβάζονται
                βέλτιστα από screen readers σε mobile viewports (WCAG
                1.3.1).
              </li>
              <li>
                Το εργαλείο επεξεργασίας παραστατικών περιέχει σύνθετα
                γραφικά widgets που ενδέχεται να απαιτούν επιπλέον
                keyboard support (WCAG 2.1.1).
              </li>
              <li>
                Κάποια PDF εξαγωγής δεν είναι πλήρως tagged για screen
                readers ακόμα.
              </li>
            </ul>
            <p className="mt-3">
              Εργαζόμαστε ενεργά για την πλήρη κάλυψη των παραπάνω σημείων.
            </p>
          </Section>

          <Section title="3. Μηχανισμοί υποστήριξης">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Πλήρης πλοήγηση με πληκτρολόγιο.</li>
              <li>
                Semantic HTML5 landmarks (header, nav, main, footer) για
                γρήγορη πλοήγηση με screen readers.
              </li>
              <li>
                Δυναμικό contrast που ικανοποιεί το WCAG 1.4.3 (τουλάχιστον
                4.5:1) σε όλα τα κύρια elements.
              </li>
              <li>
                Οι φόρμες έχουν ρητά labels, περιγραφές help και σαφή
                μηνύματα σφαλμάτων.
              </li>
              <li>
                Οι εικόνες πληροφορίας έχουν alt text· διακοσμητικές είναι
                σημασιολογικά κρυφές.
              </li>
              <li>Δεν υπάρχουν αυτόματα κινούμενα banner ή pop-ups.</li>
            </ul>
          </Section>

          <Section title="4. Αναφορά προβλημάτων">
            <p>
              Εάν αντιμετωπίζεις πρόβλημα προσβασιμότητας, στείλε μας email
              στο{" "}
              <a
                href="mailto:support@timologion.gr"
                className="font-semibold text-brand-800 underline"
              >
                support@timologion.gr
              </a>{" "}
              με:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Τη σελίδα ή τη λειτουργία όπου εντόπισες το πρόβλημα.</li>
              <li>Το είδος βοηθητικής τεχνολογίας που χρησιμοποιείς.</li>
              <li>
                Τυχόν screenshots ή περιγραφή του τι δεν λειτούργησε.
              </li>
            </ul>
            <p className="mt-3">
              Θα σου απαντήσουμε εντός <strong>10 εργάσιμων ημερών</strong>{" "}
              με προτεινόμενη λύση ή workaround.
            </p>
          </Section>

          <Section title="5. Νομική βάση">
            <p>
              Η δήλωση καλύπτει τις υποχρεώσεις προσβασιμότητας που
              απορρέουν από:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Ευρωπαϊκή Πράξη Προσβασιμότητας — Οδηγία (ΕΕ) 2019/882
              </li>
              <li>Ν. 5058/2023 (ενσωμάτωση στο ελληνικό δίκαιο)</li>
              <li>WCAG 2.1 (W3C Recommendation)</li>
              <li>EN 301 549 (ευρωπαϊκό πρότυπο)</li>
            </ul>
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
