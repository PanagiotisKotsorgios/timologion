import type { Metadata } from "next";
import { Container } from "@/components/marketing/Container";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Πολιτική Επιστροφών",
  description:
    "Πώς λειτουργούν οι επιστροφές χρημάτων στο timologion. Η χρέωση της συνδρομής γίνεται απευθείας από τον πάροχο (Wrapp) και ακολουθεί τους δικούς του όρους.",
  path: "/refunds",
});

const LAST_UPDATED = "03/08/2026";

export default function RefundsPage() {
  return (
    <>
      <section className="bg-brand-900 text-white">
        <Container size="reading" className="py-24 md:py-32">
          <p className="eyebrow text-white/60">Νομικά</p>
          <h1 className="mt-6 text-5xl font-extrabold tracking-tightest md:text-7xl">
            Πολιτική Επιστροφών
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/70">
            Πώς λειτουργούν οι επιστροφές χρημάτων για τη συνδρομή του
            timologion. Σύντομη εκδοχή: η χρέωση γίνεται από τον πάροχο
            (Wrapp) και ισχύει η δική του πολιτική.
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
          <div className="rounded-2xl border-2 border-brand-100 bg-brand-50/60 p-5 text-sm text-brand-900">
            <p className="font-bold">Σε δύο σειρές</p>
            <p className="mt-1">
              Δεν χρεώνουμε εμείς — χρεώνει η Wrapp. Ό,τι αφορά επιστροφές
              διέπεται από την πολιτική της Wrapp και όχι από το timologion.
            </p>
          </div>

          <Section title="1. Ποιος χρεώνει">
            <p>
              Η τιμολόγηση της συνδρομής γίνεται{" "}
              <strong>απευθείας από την Wrapp Α.Ε.</strong> (Νέστορος 1,
              Χαλάνδρι, ΤΚ 15231), τον πιστοποιημένο πάροχο ΥΠΑΗΕΣ που
              διαβιβάζει τα παραστατικά σου στο myDATA. Το timologion
              λειτουργεί ως εργαλείο διαχείρισης (front-end) πάνω από τη
              Wrapp — δεν εισπράττει τη συνδρομή σε δικό του λογαριασμό,
              δεν χειρίζεται στοιχεία κάρτας και δεν εκδίδει δικά του
              παραστατικά προς εσένα για τη συνδρομή.
            </p>
          </Section>

          <Section title="2. Πολιτική επιστροφών (κατά Wrapp)">
            <p>
              Σύμφωνα με τους{" "}
              <a
                href="https://wrapp.ai/el/terms_of_use"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand-800 underline"
              >
                Όρους Χρήσης της Wrapp
              </a>
              :
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong>Δεν προβλέπεται επιστροφή χρημάτων</strong> για μη
                ολοκληρωμένες περιόδους συνδρομής.
              </li>
              <li>
                Ο χρήστης μπορεί να <strong>ακυρώσει ανά πάσα στιγμή</strong>
                . Η ακύρωση ισχύει στο τέλος του τρέχοντος κύκλου χρέωσης —
                ο λογαριασμός δεν χρεώνεται ξανά αλλά συνεχίζει να λειτουργεί
                μέχρι τη λήξη της περιόδου.
              </li>
              <li>
                Μετά τη λήξη, ο λογαριασμός υποβαθμίζεται στο βασικό
                (δωρεάν) επίπεδο του παρόχου.
              </li>
            </ul>
          </Section>

          <Section title="3. Πώς κάνεις ακύρωση">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                Συνδέεσαι στον λογαριασμό σου στη Wrapp:{" "}
                <a
                  href="https://wrapp.ai/el/users/sign_in"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand-800 underline"
                >
                  wrapp.ai/el/users/sign_in
                </a>
                .
              </li>
              <li>Πηγαίνεις στο πάνελ συνδρομής και επιλέγεις ακύρωση.</li>
              <li>
                Μπορείς επίσης να ξεκινήσεις τη διαδικασία μέσα από το
                timologion: <em>Ρυθμίσεις → Συνδρομή → «Ακύρωση συνδρομής
                στη Wrapp»</em> (ανοίγει το ίδιο πάνελ σε νέα καρτέλα).
              </li>
            </ul>
          </Section>

          <Section title="4. Δικαιώματα καταναλωτών (14 ημέρες)">
            <p>
              Εάν είσαι <strong>καταναλωτής</strong> (φυσικό πρόσωπο εκτός
              επαγγελματικής δραστηριότητας), έχεις δικαίωμα υπαναχώρησης
              14 ημερών σύμφωνα με τον Ν. 2251/1994 και την Οδηγία
              2011/83/ΕΕ. Το δικαίωμα{" "}
              <strong>χάνεται όταν η παροχή έχει ξεκινήσει με τη ρητή
              συγκατάθεσή σου</strong> — δηλαδή μόλις εκδοθεί το πρώτο
              παραστατικό μέσα από το timologion. Αυτό γιατί κάθε έκδοση
              καταναλώνει πόρους του παρόχου (myDATA transmission).
            </p>
            <p className="mt-3">
              Οι επιχειρήσεις και οι ελεύθεροι επαγγελματίες που εγγράφονται
              στο πλαίσιο της δραστηριότητάς τους <strong>δεν δικαιούνται
              αυτό το δικαίωμα</strong> — η συμφωνία διέπεται από τους
              εμπορικούς όρους.
            </p>
          </Section>

          <Section title="5. Ειδικές περιπτώσεις">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong>Λάθος χρέωση από τη Wrapp</strong>: Επικοινώνησε
                απευθείας με τη Wrapp μέσω{" "}
                <a
                  href="https://wrapp.ai"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand-800 underline"
                >
                  wrapp.ai
                </a>{" "}
                — εμείς δεν έχουμε πρόσβαση στο billing τους.
              </li>
              <li>
                <strong>Παύση παροχής υπηρεσίας από τη Wrapp</strong>: Αν η
                Wrapp σταματήσει να λειτουργεί ως πάροχος, το timologion δεν
                μπορεί να εκδώσει παραστατικά. Θα σας ενημερώσουμε άμεσα και
                θα βοηθήσουμε στη μετάβαση σε άλλον πάροχο, αλλά τυχόν
                αξιώσεις για μη ολοκληρωμένη περίοδο κατευθύνονται προς τη
                Wrapp.
              </li>
              <li>
                <strong>Παύση παροχής υπηρεσίας από το timologion</strong>:
                Αν το timologion σταματήσει να παρέχει την πλατφόρμα, θα
                σου δώσουμε τουλάχιστον 30 ημέρες προειδοποίηση για εξαγωγή
                των δεδομένων σου (XLSX / PDF). Η συνδρομή σου στη Wrapp
                παραμένει ενεργή ανεξάρτητα — μπορείς να συνεχίσεις να την
                χρησιμοποιείς μέσα από το δικό της UI.
              </li>
            </ul>
          </Section>

          <Section title="6. Επικοινωνία">
            <p>
              Για ερωτήσεις σχετικά με την τεχνική λειτουργία του
              timologion:{" "}
              <a
                className="font-semibold text-brand-800 underline"
                href="mailto:support@timologion.gr"
              >
                support@timologion.gr
              </a>
              .
            </p>
            <p className="mt-3">
              Για ερωτήσεις σχετικά με χρεώσεις, τιμολόγηση συνδρομής,
              επιστροφές ή ακυρώσεις: απευθύνσου στη Wrapp μέσω{" "}
              <a
                href="https://wrapp.ai"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand-800 underline"
              >
                wrapp.ai
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
