import type { Metadata } from "next";
import { Container } from "@/components/marketing/Container";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Όροι Χρήσης",
  description:
    "Οι όροι υπό τους οποίους παρέχουμε την υπηρεσία Τιμολόγιον σε ελληνικές επιχειρήσεις, ελεύθερους επαγγελματίες και μικρές επιχειρήσεις. Συμμόρφωση με ελληνική & ευρωπαϊκή νομοθεσία.",
  path: "/terms",
});

const LAST_UPDATED = "03/08/2026";

export default function TermsPage() {
  return (
    <>
      <section className="bg-brand-900 text-white">
        <Container size="reading" className="py-24 md:py-32">
          <p className="eyebrow text-white/60">Νομικά</p>
          <h1 className="mt-6 text-5xl font-extrabold tracking-tightest md:text-7xl">
            Όροι χρήσης
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/70">
            Το συμφωνητικό μεταξύ σου και του timologion για τη χρήση της
            πλατφόρμας. Σε συμμόρφωση με την ελληνική και την ευρωπαϊκή
            νομοθεσία, συμπεριλαμβανομένων του GDPR, του Ν. 4624/2019 και
            του Ν. 4808/2021.
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
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="font-bold">Σημαντικό</p>
            <p className="mt-1">
              Οι όροι αυτοί συντάχθηκαν με στόχο τη μέγιστη κάλυψη υπό
              ελληνικό και ενωσιακό δίκαιο. Εάν είσαι καταναλωτής (φυσικό
              πρόσωπο που δεν χρησιμοποιεί την υπηρεσία στο πλαίσιο
              επαγγελματικής δραστηριότητας), κρατικές διατάξεις υπερτερούν
              των παρακάτω ρητρών.
            </p>
          </div>

          <Section title="1. Πάροχος & ταυτοποίηση">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                Την υπηρεσία «timologion» (εφεξής η «Υπηρεσία») παρέχει
                ο Κοτσόργιος Παναγιώτης (Ατομική επιχείρηση), με ΑΦΜ
                176091030 και έδρα: Εργατικές Κατοικίες Λιμάνι
                Μεσολογγίου 113, Μεσολόγγι Τ.Κ. 30200 — αναλυτικά
                στοιχεία στη σελίδα{" "}
                <a
                  href="/legal-info"
                  className="font-semibold text-brand-800 underline"
                >
                  Νομικές πληροφορίες
                </a>{" "}
                (εφεξής ο «Πάροχος», «εμείς»).
              </li>
              <li>
                Επικοινωνία υποστήριξης:{" "}
                <a
                  className="font-semibold text-brand-800 underline"
                  href="mailto:support@timologion.gr"
                >
                  support@timologion.gr
                </a>
                , τηλέφωνο +30 6986 788 178 (Δευτ–Παρ 09:00–18:00 EET).
              </li>
            </ul>
          </Section>

          <Section title="2. Ορισμοί">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong>Υπηρεσία</strong>: η διαδικτυακή εφαρμογή timologion
                για διαχείριση πελατολογίου, ειδών, παραστατικών, ραντεβού,
                εξόδων και αναφορών.
              </li>
              <li>
                <strong>Χρήστης</strong>: κάθε φυσικό ή νομικό πρόσωπο που
                διατηρεί λογαριασμό στην Υπηρεσία.
              </li>
              <li>
                <strong>Wrapp / Πάροχος myDATA</strong>: η πιστοποιημένη
                υπηρεσία ΥΠΑΗΕΣ (Wrapp) που πραγματοποιεί τη φοροσήμανση και
                τη διαβίβαση στο myDATA. Δεν είμαστε εμείς. Ο Χρήστης
                υπογράφει ξεχωριστή σύμβαση με τη Wrapp.
              </li>
              <li>
                <strong>Δεδομένα Χρήστη</strong>: όλα τα δεδομένα που ο
                Χρήστης καταχωρεί ή δημιουργεί μέσω της Υπηρεσίας (πελάτες,
                είδη, παραστατικά κ.λπ.). Παραμένουν στη δική του κυριότητα.
              </li>
            </ul>
          </Section>

          <Section title="3. Η φύση της Υπηρεσίας">
            <p>
              Το timologion είναι εργαλείο διαχείρισης και front-end στον
              πάροχο ηλεκτρονικής τιμολόγησης. Δηλώνουμε ρητά ότι{" "}
              <strong>δεν αποτελούμε πάροχο ΥΠΑΗΕΣ</strong>. Η φοροσήμανση,
              η ανάθεση MARK/UID/QR και η διαβίβαση στο myDATA
              πραγματοποιούνται αποκλειστικά από τη Wrapp, με βάση την
              απευθείας σύμβασή σου μαζί της.
            </p>
          </Section>

          <Section title="4. Λογαριασμός & εγγραφή">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                Απαιτείται εγγραφή με έγκυρο email και επιβεβαίωση αυτού.
                Μπορείς επίσης να συνδεθείς μέσω Google ή Facebook (OAuth).
              </li>
              <li>
                Οφείλεις να παρέχεις αληθή, ακριβή και επίκαιρα στοιχεία.
                Είσαι υπεύθυνος για την ασφάλεια των διαπιστευτηρίων σου και
                για κάθε ενέργεια που εκτελείται από τον λογαριασμό σου.
              </li>
              <li>
                Προτείνουμε την ενεργοποίηση 2FA (μέσω email OTP) από τις
                Ρυθμίσεις.
              </li>
              <li>
                Δεν επιτρέπεται δημιουργία λογαριασμού από άτομα κάτω των
                18 ετών χωρίς έγκριση κηδεμόνα.
              </li>
              <li>
                Διατηρούμε το δικαίωμα αναστολής ή τερματισμού λογαριασμών
                που χρησιμοποιούνται καταχρηστικά, παραβατικά ή απατηλά.
              </li>
            </ul>
          </Section>

          <Section title="5. Συνδρομές, χρεώσεις & επιστροφές">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                Η πλατφόρμα timologion είναι front-end. Η <strong>χρέωση της
                συνδρομής γίνεται απευθείας από τον πιστοποιημένο πάροχο
                Wrapp Α.Ε.</strong>, μέσω του δικού του παρόχου πληρωμών
                (Stripe). Το timologion δεν διαχειρίζεται πληρωμές
                συνδρομής, ούτε εισπράττει σε δικό του λογαριασμό ή δικό
                του acquirer. Οι τιμές στη σελίδα{" "}
                <a
                  href="/pricing"
                  className="font-semibold text-brand-800 underline"
                >
                  Κόστους
                </a>{" "}
                αναγράφονται με συμπεριλαμβανόμενο ΦΠΑ 24%.
              </li>
              <li>
                Κάθε ετήσια περίοδος κλείνει με ό,τι έρθει πρώτο — 12 μήνες
                ή η ολοκλήρωση του ορίου παραστατικών του πακέτου. Η
                ανανέωση δημιουργεί νέα περίοδο με νέο 12μηνο και νέο όριο.
              </li>
              <li>
                <strong>Αλλαγή / ακύρωση πακέτου</strong>: Οι αλλαγές
                (αναβάθμιση, υποβάθμιση, ακύρωση) πραγματοποιούνται εντός
                του λογαριασμού σου στη Wrapp. Το timologion σε δρομολογεί
                εκεί με το κουμπί «Άλλαξε πακέτο στη Wrapp» στη σελίδα
                Συνδρομής.
              </li>
              <li>
                <strong>Πολιτική επιστροφών</strong>: Η επιστροφή χρημάτων
                διέπεται από τους Όρους Χρήσης της Wrapp. Σύμφωνα με αυτούς
                (
                <a
                  href="https://wrapp.ai/el/terms_of_use"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand-800 underline"
                >
                  wrapp.ai/el/terms_of_use
                </a>
                ), δεν προβλέπεται επιστροφή χρημάτων για μη ολοκληρωμένες
                περιόδους συνδρομής· η συνδρομή απλώς δεν ανανεώνεται. Για
                όλα τα ζητήματα χρεώσεων απευθύνεσαι στη Wrapp. Δείτε και
                τη σελίδα{" "}
                <a
                  href="/refunds"
                  className="font-semibold text-brand-800 underline"
                >
                  Πολιτικής Επιστροφών
                </a>{" "}
                στο timologion.gr.
              </li>
              <li>
                <strong>Δικαιώματα καταναλωτών</strong>: Όπου εφαρμόζεται
                υποχρεωτική διάταξη υπέρ καταναλωτών (Ν. 2251/1994, οδηγία
                2011/83/ΕΕ), αυτή υπερτερεί των παραπάνω. Το δικαίωμα
                υπαναχώρησης 14 ημερών χάνεται μόλις ξεκινήσει η παροχή με
                τη ρητή συγκατάθεση του χρήστη — δηλαδή μόλις εκδοθεί το
                πρώτο παραστατικό.
              </li>
            </ul>
          </Section>

          <Section title="6. Επιτρεπτή χρήση">
            <p>Απαγορεύεται ρητά:</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Καταχρηστική, δόλια ή παραβατική χρήση της Υπηρεσίας.</li>
              <li>
                Παράκαμψη μέτρων ασφαλείας, reverse engineering, scraping ή
                μαζική αυτοματοποιημένη πρόσβαση χωρίς έγγραφη άδεια.
              </li>
              <li>
                Έκδοση εικονικών, παραπλανητικών ή πλαστών παραστατικών, ή
                χρήση για ξέπλυμα χρήματος, φοροδιαφυγή ή άλλες παράνομες
                δραστηριότητες.
              </li>
              <li>
                Χρήση που παραβιάζει δικαιώματα τρίτων (πνευματική
                ιδιοκτησία, εμπορικά σήματα, προσωπικά δεδομένα).
              </li>
              <li>
                Ανάρτηση παράνομου, δυσφημιστικού ή προσβλητικού
                περιεχομένου.
              </li>
            </ul>
          </Section>

          <Section title="7. Πνευματικά δικαιώματα & άδεια χρήσης">
            <p>
              Το λογισμικό, το design, το brand «timologion», τα λογότυπα και
              τα υπόλοιπα προστατευόμενα στοιχεία ανήκουν σε εμάς ή στους
              δικαιοπαρόχους μας. Σου παρέχεται μη αποκλειστική, μη
              μεταβιβάσιμη, ανακλητή άδεια χρήσης για όσο διατηρείς ενεργό
              λογαριασμό.
            </p>
            <p className="mt-3">
              Τα Δεδομένα Χρήστη παραμένουν στη δική σου κυριότητα.
              Μπορείς να τα εξάγεις οποιαδήποτε στιγμή σε μορφή Excel (XLSX)
              ή PDF.
            </p>
          </Section>

          <Section title="8. Προσωπικά δεδομένα & GDPR">
            <p>
              Η επεξεργασία προσωπικών δεδομένων διέπεται από την{" "}
              <a
                href="/privacy"
                className="font-semibold text-brand-800 underline"
              >
                Πολιτική Απορρήτου
              </a>{" "}
              μας, σε συμμόρφωση με τον Κανονισμό (ΕΕ) 2016/679 (GDPR) και
              τον Ν. 4624/2019. Ασκείς τα δικαιώματά σου
              (πρόσβαση/διόρθωση/διαγραφή/φορητότητα/εναντίωση/περιορισμός)
              στέλνοντας email στο support@timologion.gr.
            </p>
          </Section>

          <Section title="9. Υπηρεσίες τρίτων & δικοί τους όροι">
            <p>
              Η Υπηρεσία διασυνδέεται με τους παρακάτω τρίτους παρόχους.
              Χρησιμοποιώντας το timologion αναγνωρίζεις ότι οι δικές
              τους αντίστοιχες συμβατικές δεσμεύσεις (Όροι Χρήσης,
              Πολιτική Απορρήτου) διέπουν τη σχέση σου μαζί τους. Είναι
              δική σου ευθύνη να τους διαβάσεις.
            </p>

            <div className="mt-4 overflow-x-auto rounded-2xl border-2 border-black/10">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-brand-50/60">
                  <tr>
                    <th className="px-4 py-3 text-brand-900">Πάροχος</th>
                    <th className="px-4 py-3 text-brand-900">Σκοπός</th>
                    <th className="px-4 py-3 text-brand-900">Έδρα</th>
                    <th className="px-4 py-3 text-brand-900">Όροι / Απόρρητο</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  <ThirdPartyRow
                    name="Wrapp Α.Ε."
                    purpose="Πιστοποιημένος πάροχος ΥΠΑΗΕΣ — φοροσήμανση, διαβίβαση στο myDATA + χρέωση συνδρομής"
                    hq="Ελλάδα (ΕΕ)"
                    links={[
                      { label: "Terms", href: "https://wrapp.ai/el/terms_of_use" },
                      { label: "Privacy", href: "https://wrapp.ai/el/data_protection" },
                    ]}
                  />
                  <ThirdPartyRow
                    name="Stripe (μέσω Wrapp)"
                    purpose="Επεξεργασία πληρωμής συνδρομής — τα δεδομένα κάρτας δεν περνούν από το timologion"
                    hq="Ιρλανδία (ΕΕ)"
                    links={[
                      { label: "Terms", href: "https://stripe.com/legal/consumer" },
                      { label: "Privacy", href: "https://stripe.com/privacy" },
                    ]}
                  />
                  <ThirdPartyRow
                    name="Brevo (πρώην Sendinblue)"
                    purpose="Αποστολή transactional email (επιβεβαίωση, OTP, ειδοποιήσεις)"
                    hq="Γαλλία (ΕΕ)"
                    links={[
                      { label: "Terms", href: "https://www.brevo.com/legal/termsofuse/" },
                      { label: "Privacy", href: "https://www.brevo.com/legal/privacypolicy/" },
                    ]}
                  />
                  <ThirdPartyRow
                    name="Google (OAuth)"
                    purpose="Προαιρετική σύνδεση με λογαριασμό Google"
                    hq="ΗΠΑ (SCC 2021/914)"
                    links={[
                      { label: "Terms", href: "https://policies.google.com/terms" },
                      { label: "Privacy", href: "https://policies.google.com/privacy" },
                    ]}
                  />
                  <ThirdPartyRow
                    name="Meta / Facebook (OAuth)"
                    purpose="Προαιρετική σύνδεση με λογαριασμό Facebook"
                    hq="ΗΠΑ (SCC 2021/914)"
                    links={[
                      { label: "Terms", href: "https://www.facebook.com/legal/terms" },
                      { label: "Privacy", href: "https://www.facebook.com/policy.php" },
                    ]}
                  />
                  <ThirdPartyRow
                    name="Sentry"
                    purpose="Παρακολούθηση σφαλμάτων εφαρμογής"
                    hq="ΗΠΑ (SCC 2021/914)"
                    links={[
                      { label: "Terms", href: "https://sentry.io/terms/" },
                      { label: "Privacy", href: "https://sentry.io/privacy/" },
                    ]}
                  />
                  <ThirdPartyRow
                    name="ΑΑΔΕ / ΓΓΠΣ"
                    purpose="Αναζήτηση ΑΦΜ μέσω των δικών σου διαπιστευτηρίων ΓΓΠΣ"
                    hq="Ελλάδα (δημόσια αρχή)"
                    links={[
                      { label: "aade.gr", href: "https://www.aade.gr" },
                    ]}
                  />
                  <ThirdPartyRow
                    name="Πάροχος cloud hosting"
                    purpose="Φιλοξενία εφαρμογής & βάσης δεδομένων"
                    hq="ΕΕ"
                    links={[
                      { label: "coolify.io", href: "https://coolify.io" },
                    ]}
                  />
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-sm text-black/60">
              Δεν φέρουμε ευθύνη για διακοπές, βλάβες, αλλαγές τιμολογιακής
              πολιτικής ή αστοχίες που προκαλούνται από τις παραπάνω
              υπηρεσίες. Οι δικοί τους όροι διέπουν τη σχέση σου μαζί τους
              και σε ορισμένες περιπτώσεις (π.χ. Google, Facebook, Sentry)
              μπορεί να απαιτείται διαβίβαση δεδομένων εκτός ΕΕ βάσει των
              τυποποιημένων συμβατικών ρητρών (SCC 2021/914).
            </p>
          </Section>

          <Section title="10. Διαθεσιμότητα υπηρεσίας">
            <p>
              Καταβάλλουμε εύλογη προσπάθεια για διαθεσιμότητα 24/7. Δεν
              εγγυόμαστε συγκεκριμένο SLA στη δωρεάν χρήση. Για πακέτα με
              SLA (Enterprise/Corporate) οι συγκεκριμένοι όροι
              συμφωνούνται εγγράφως. Ενδέχεται να γίνονται
              προγραμματισμένες συντηρήσεις (κατά το δυνατόν εκτός
              εργασίμων ωρών) με προηγούμενη ειδοποίηση.
            </p>
          </Section>

          <Section title="11. Εγγυήσεις & αποποιήσεις">
            <p>
              Η Υπηρεσία παρέχεται «ως έχει» και «όπως διατίθεται». Δεν
              παρέχουμε ρητή ή σιωπηρή εγγύηση εμπορευσιμότητας,
              καταλληλότητας για συγκεκριμένο σκοπό ή μη προσβολής
              δικαιωμάτων, στον μέγιστο βαθμό που επιτρέπει ο νόμος.
            </p>
          </Section>

          <Section title="12. Περιορισμός ευθύνης">
            <p>
              Στον μέγιστο βαθμό που επιτρέπει ο νόμος, δεν ευθυνόμαστε για
              έμμεσες ή αποθετικές ζημιές, απώλεια κερδών, δεδομένων ή
              φήμης. Η συνολική ευθύνη μας για οποιαδήποτε αξίωση δεν
              υπερβαίνει το ποσό που κατέβαλες στην Υπηρεσία τους
              τελευταίους 12 μήνες πριν την αξίωση.
            </p>
            <p className="mt-3">
              Οι παραπάνω περιορισμοί <strong>δεν εφαρμόζονται</strong> σε
              περιπτώσεις δόλου, βαριάς αμέλειας, βλάβης της σωματικής
              ακεραιότητας ή θανάτου, ή όπου δεν επιτρέπονται από το
              εφαρμοστέο δίκαιο (ιδίως προς καταναλωτές).
            </p>
          </Section>

          <Section title="13. Ανωτέρα βία">
            <p>
              Δεν ευθυνόμαστε για μη εκπλήρωση οφειλόμενη σε γεγονότα εκτός
              εύλογου ελέγχου μας (φυσικές καταστροφές, απεργίες, πόλεμος,
              διακοπές παρόχων cloud, αποφάσεις δημόσιας αρχής, κ.λπ.).
            </p>
          </Section>

          <Section title="14. Τερματισμός λογαριασμού">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                Μπορείς να διαγράψεις τον λογαριασμό σου ανά πάσα στιγμή από
                τις Ρυθμίσεις. Τα Δεδομένα Χρήστη είναι διαθέσιμα για
                εξαγωγή για 30 ημέρες μετά τη διαγραφή, εκτός εάν ο νόμος
                απαιτεί μεγαλύτερο χρόνο τήρησης (π.χ. λογιστικά αρχεία).
              </li>
              <li>
                Διατηρούμε το δικαίωμα άμεσου τερματισμού για ουσιώδη
                παράβαση των παρόντων όρων, με ειδοποίηση όπου είναι εύλογο.
              </li>
            </ul>
          </Section>

          <Section title="15. Τροποποιήσεις όρων">
            <p>
              Ενδέχεται να τροποποιήσουμε τους παρόντες όρους. Ουσιώδεις
              αλλαγές γνωστοποιούνται με email ή εντός της εφαρμογής
              τουλάχιστον 15 ημέρες πριν την εφαρμογή τους. Η συνέχιση
              χρήσης μετά την τροποποίηση συνιστά αποδοχή των νέων όρων.
              Έχεις δικαίωμα να τερματίσεις τον λογαριασμό σου εντός της
              περιόδου γνωστοποίησης.
            </p>
          </Section>

          <Section title="16. Εφαρμοστέο δίκαιο & δικαιοδοσία">
            <p>
              Οι παρόντες όροι διέπονται από το ελληνικό δίκαιο. Για κάθε
              διαφορά που δεν επιλύεται συναινετικά, αρμόδια ορίζονται τα
              δικαστήρια Αθηνών.
            </p>
            <p className="mt-3">
              Για καταναλωτές παραμένει η αρμοδιότητα των δικαστηρίων του
              τόπου κατοικίας τους σύμφωνα με το ενωσιακό δίκαιο.
            </p>
          </Section>

          <Section title="17. Εναλλακτική επίλυση διαφορών (ADR/ODR)">
            <p>
              Εάν είσαι καταναλωτής, μπορείς να απευθυνθείς για εξωδικαστική
              επίλυση στον{" "}
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
              .
            </p>
          </Section>

          <Section title="18. Ακυρότητα ρήτρας">
            <p>
              Αν κάποιος όρος κηρυχθεί άκυρος ή ανεφάρμοστος, οι υπόλοιποι
              όροι παραμένουν σε ισχύ και ο άκυρος όρος αντικαθίσταται από
              όρο που πλησιάζει όσο το δυνατόν την αρχική βούληση των μερών.
            </p>
          </Section>

          <Section title="19. Επικοινωνία">
            <p>
              Για ερωτήσεις σχετικά με τους όρους:{" "}
              <a
                className="font-semibold text-brand-800 underline"
                href="mailto:support@timologion.gr"
              >
                support@timologion.gr
              </a>
              , +30 6986 788 178.
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

function ThirdPartyRow({
  name,
  purpose,
  hq,
  links,
}: {
  name: string;
  purpose: string;
  hq: string;
  links: { label: string; href: string }[];
}) {
  return (
    <tr>
      <td className="px-4 py-3 font-semibold text-brand-900">{name}</td>
      <td className="px-4 py-3 text-black/70">{purpose}</td>
      <td className="px-4 py-3 text-black/60">{hq}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-brand-800 underline underline-offset-4 hover:text-brand-900"
            >
              {l.label} →
            </a>
          ))}
        </div>
      </td>
    </tr>
  );
}
