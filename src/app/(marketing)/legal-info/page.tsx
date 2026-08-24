import type { Metadata } from "next";
import { Container } from "@/components/marketing/Container";
import { pageMetadata } from "@/lib/seo";

/**
 * Νομικές Πληροφορίες / Impressum. Required by Greek e-commerce law
 * (Π.Δ. 131/2003 άρθρο 4 — implementation of Directive 2000/31/EC on
 * electronic commerce): the operator of any commercial online service
 * must publish, in a permanently accessible location, identifying
 * data of the company (name, address, VAT, ΓΕΜΗ registry number,
 * chamber of commerce membership, contact channels, and — where
 * relevant — the professional regulator).
 *
 * The values below are placeholders. Fill in the ACTUAL registration
 * details of your legal entity before going to production.
 */

export const metadata: Metadata = pageMetadata({
  title: "Νομικές πληροφορίες",
  description:
    "Στοιχεία της εταιρείας που διαχειρίζεται το timologion, όπως απαιτούνται από το Π.Δ. 131/2003 και την οδηγία 2000/31/ΕΚ για το ηλεκτρονικό εμπόριο.",
  path: "/legal-info",
});

const LAST_UPDATED = "24/08/2026";

export default function LegalInfoPage() {
  return (
    <>
      <section className="bg-brand-900 text-white">
        <Container size="reading" className="py-24 md:py-32">
          <p className="eyebrow text-white/60">Νομικά</p>
          <h1 className="mt-6 text-5xl font-extrabold tracking-tightest md:text-7xl">
            Νομικές πληροφορίες
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/70">
            Στοιχεία ταυτότητας του παρόχου της υπηρεσίας, όπως
            απαιτούνται από το Π.Δ. 131/2003 (οδηγία 2000/31/ΕΚ για το
            ηλεκτρονικό εμπόριο) και τον Ν. 2251/1994 για την προστασία
            του καταναλωτή.
          </p>
          <p className="mt-6 text-sm text-white/50">
            Τελευταία ενημέρωση: {LAST_UPDATED}
          </p>
        </Container>
      </section>

      <section className="bg-white">
        <Container size="reading" className="py-20 md:py-24 space-y-14 text-black">
          <Section title="1. Στοιχεία παρόχου">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong>Ονοματεπώνυμο</strong>: Κοτσόργιος Παναγιώτης
              </li>
              <li>
                <strong>Διακριτικός τίτλος</strong>: Τιμολόγιον / timologion
              </li>
              <li>
                <strong>Νομική μορφή</strong>: Ατομική επιχείρηση
              </li>
              <li>
                <strong>ΑΦΜ</strong>: 176091030
              </li>
              <li>
                <strong>ΔΟΥ</strong>: Μεσολογγίου
              </li>
              <li>
                <strong>Έδρα</strong>: Εργατικές Κατοικίες Λιμάνι
                Μεσολογγίου 113, Μεσολόγγι Αιτωλοακαρνανίας, Τ.Κ.
                30200, Ελλάδα
              </li>
            </ul>
            <p className="mt-3 text-sm text-black/60">
              Ως ατομική επιχείρηση, ο νόμιμος εκπρόσωπος ταυτίζεται
              με το φυσικό πρόσωπο του παραπάνω ονοματεπωνύμου.
            </p>
          </Section>

          <Section title="2. Επικοινωνία">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                Email γενικής επικοινωνίας:{" "}
                <a
                  className="font-semibold text-brand-800 underline"
                  href="mailto:support@timologion.gr"
                >
                  support@timologion.gr
                </a>
              </li>
              <li>
                Τηλέφωνο επικοινωνίας:{" "}
                <a
                  className="font-semibold text-brand-800 underline"
                  href="tel:+306986788178"
                >
                  +30 6986 788 178
                </a>{" "}
                (Δευτ–Παρ 09:00–18:00 EET)
              </li>
              <li>
                Ταχυδρομική διεύθυνση: όπως αναφέρεται στην ενότητα «Στοιχεία
                παρόχου» παραπάνω.
              </li>
            </ul>
          </Section>

          <Section title="3. Δραστηριότητα & εποπτεία">
            <p>
              Η εταιρεία παρέχει διαδικτυακή εφαρμογή διαχείρισης
              παραστατικών και ενσωματώνεται με πιστοποιημένο πάροχο
              ηλεκτρονικής τιμολόγησης (ΥΠΑΗΕΣ) της ΑΑΔΕ. Η ίδια η
              εταιρεία <strong>δεν</strong> είναι πάροχος ΥΠΑΗΕΣ και δεν
              υποκαθιστά τη νόμιμη εγγραφή της επιχείρησης-πελάτη στο
              myDATA.
            </p>
            <p className="mt-3">
              Δεν υπάγεται σε επαγγελματική εποπτεία επιμελητηρίου
              (πέραν του γενικού πλαισίου του{" "}
              <strong>ΓΕΜΗ</strong> και του κατά τόπον επιμελητηρίου).
            </p>
          </Section>

          <Section title="4. Υπεύθυνος Προστασίας Δεδομένων (DPO)">
            <p>
              Δεν υφίσταται νομική υποχρέωση διορισμού DPO (Άρθρο 37
              GDPR) για την τρέχουσα κλίμακα επεξεργασίας. Για κάθε
              θέμα προσωπικών δεδομένων απευθύνσου στο{" "}
              <a
                className="font-semibold text-brand-800 underline"
                href="mailto:support@timologion.gr"
              >
                support@timologion.gr
              </a>{" "}
              — δες την{" "}
              <a
                href="/privacy"
                className="font-semibold text-brand-800 underline"
              >
                Πολιτική Απορρήτου
              </a>{" "}
              για πλήρη ενημέρωση.
            </p>
          </Section>

          <Section title="5. Εποπτεύουσα αρχή προστασίας δεδομένων">
            <p>
              Αρμόδια εποπτική αρχή είναι η{" "}
              <a
                href="https://www.dpa.gr"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand-800 underline"
              >
                Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (ΑΠΔΠΧ)
              </a>
              . Στοιχεία: Κηφισίας 1-3, 11523 Αθήνα, τηλ. 210 6475600.
            </p>
          </Section>

          <Section title="6. Καταναλωτές — εναλλακτική επίλυση διαφορών">
            <p>
              Καταναλωτής (φυσικό πρόσωπο εκτός επαγγελματικού πλαισίου)
              μπορεί να απευθυνθεί για εξωδικαστική επίλυση στον{" "}
              <a
                href="https://www.synigoroskatanaloti.gr"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand-800 underline"
              >
                Συνήγορο του Καταναλωτή
              </a>{" "}
              και στην{" "}
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand-800 underline"
              >
                Ευρωπαϊκή Πλατφόρμα Ηλεκτρονικής Επίλυσης Διαφορών (ODR)
              </a>
              , σύμφωνα με τον Κανονισμό (ΕΕ) 524/2013.
            </p>
          </Section>

          <Section title="7. Εφαρμοστέο δίκαιο">
            <p>
              Οι σχέσεις με τους χρήστες διέπονται από το ελληνικό
              δίκαιο, με ρήτρες που δεν περιορίζουν τα υποχρεωτικά
              δικαιώματα των καταναλωτών όπου εφαρμόζεται ο Ν. 2251/1994
              και το ενωσιακό καταναλωτικό δίκαιο.
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
