import type { Metadata } from "next";
import { Container } from "@/components/marketing/Container";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Πολιτική Απορρήτου",
  description:
    "Πώς συλλέγουμε, χρησιμοποιούμε και προστατεύουμε τα προσωπικά σου δεδομένα στο Τιμολόγιον. Πλήρης συμμόρφωση με GDPR και Ν. 4624/2019.",
  path: "/privacy",
});

const LAST_UPDATED = "27/07/2026";

export default function PrivacyPage() {
  return (
    <>
      <section className="bg-brand-900 text-white">
        <Container size="reading" className="py-24 md:py-32">
          <p className="eyebrow text-white/60">Νομικά</p>
          <h1 className="mt-6 text-5xl font-extrabold tracking-tightest md:text-7xl">
            Πολιτική Απορρήτου
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/70">
            Η δέσμευσή μας για την προστασία των προσωπικών σου δεδομένων —
            σύμφωνα με τον Κανονισμό (ΕΕ) 2016/679 (GDPR), τον Ν. 4624/2019
            και το ενωσιακό δίκαιο ηλεκτρονικών επικοινωνιών.
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
            <p className="font-bold">Σε λίγες γραμμές</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Δεν πουλάμε τα δεδομένα σου. Ποτέ.</li>
              <li>
                Ζητάμε μόνο τα δεδομένα που χρειαζόμαστε για να
                λειτουργήσει η υπηρεσία.
              </li>
              <li>Έχεις πλήρη δικαιώματα GDPR — εξήγηση παρακάτω.</li>
              <li>
                Επικοινώνησε με το{" "}
                <a
                  className="font-semibold underline"
                  href="mailto:support@timologion.gr"
                >
                  support@timologion.gr
                </a>{" "}
                για οποιοδήποτε αίτημα προσωπικών δεδομένων.
              </li>
            </ul>
          </div>

          <Section title="1. Υπεύθυνος επεξεργασίας">
            <p>
              Υπεύθυνος επεξεργασίας για τα δεδομένα λογαριασμού και
              χρήσης της πλατφόρμας είναι το timologion. Στοιχεία
              επικοινωνίας:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Email: support@timologion.gr</li>
              <li>Τηλέφωνο: +30 2631 028 971</li>
              <li>
                Ταχυδρομική διεύθυνση: όπως δημοσιεύεται στη σελίδα
                Επικοινωνίας
              </li>
            </ul>
            <p className="mt-3">
              Για τα Δεδομένα Χρήστη που καταχωρείς στην εφαρμογή
              (πελατολόγιο, παραστατικά κ.λπ.), εσύ είσαι Υπεύθυνος
              Επεξεργασίας και εμείς Εκτελών την Επεξεργασία, με βάση
              την DPA που περιλαμβάνεται στους Όρους Χρήσης.
            </p>
          </Section>

          <Section title="2. Ποια δεδομένα συλλέγουμε">
            <h3 className="mt-4 text-lg font-bold text-brand-900">
              2.1 Δεδομένα λογαριασμού
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Ονοματεπώνυμο</li>
              <li>Διεύθυνση email</li>
              <li>Κωδικός πρόσβασης (αποθηκευμένος με Argon2id)</li>
              <li>Τηλέφωνο (προαιρετικά)</li>
              <li>
                Στοιχεία επιχείρησης: επωνυμία, ΑΦΜ, ΔΟΥ, δραστηριότητα,
                διεύθυνση
              </li>
              <li>
                Στοιχεία OAuth (αν συνδεθείς με Google/Facebook):
                αναγνωριστικά παρόχου, email
              </li>
            </ul>

            <h3 className="mt-6 text-lg font-bold text-brand-900">
              2.2 Δεδομένα χρήσης
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>IP διεύθυνση, user-agent, χρόνοι σύνδεσης</li>
              <li>Logs ενεργειών (audit trail)</li>
              <li>Cookies τεχνικά αναγκαία (βλ. Πολιτική Cookies)</li>
            </ul>

            <h3 className="mt-6 text-lg font-bold text-brand-900">
              2.3 Δεδομένα που εσύ καταχωρείς (Δεδομένα Χρήστη)
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Πελατολόγιο (φυσικά ή νομικά πρόσωπα)</li>
              <li>Είδη & υπηρεσίες</li>
              <li>Παραστατικά, πληρωμές, έξοδα, προμηθευτές, ραντεβού</li>
              <li>Ενδεχόμενα προσωπικά δεδομένα τρίτων που καταχωρείς</li>
            </ul>
            <p className="mt-3 text-sm text-black/60">
              Για τα Δεδομένα Χρήστη, εσύ έχεις την ευθύνη νόμιμης
              συλλογής και ενημέρωσης των υποκειμένων.
            </p>

            <h3 className="mt-6 text-lg font-bold text-brand-900">
              2.4 Δεδομένα από τρίτους
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Wrapp</strong> — δεδομένα ταυτοποίησης και
                κατάστασης myDATA
              </li>
              <li>
                <strong>ΑΑΔΕ/ΓΓΠΣ</strong> — δεδομένα δημόσιου μητρώου ΑΦΜ
                (μόνο μέσω των διαπιστευτηρίων που δίνεις)
              </li>
            </ul>
          </Section>

          <Section title="3. Νομική βάση επεξεργασίας (Άρθρο 6 GDPR)">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong>Εκτέλεση σύμβασης</strong> (Άρθρο 6(1)(β)): για την
                παροχή του λογαριασμού και της υπηρεσίας.
              </li>
              <li>
                <strong>Νόμιμη υποχρέωση</strong> (Άρθρο 6(1)(γ)): για
                τήρηση φορολογικών, λογιστικών και εργατικών αρχείων.
              </li>
              <li>
                <strong>Έννομο συμφέρον</strong> (Άρθρο 6(1)(στ)): για
                ασφάλεια της υπηρεσίας, βελτίωση, πρόληψη απάτης.
              </li>
              <li>
                <strong>Συγκατάθεση</strong> (Άρθρο 6(1)(α)): για marketing
                emails, μη τεχνικά αναγκαία cookies. Ανακαλείται εύκολα
                όποτε θέλεις.
              </li>
            </ul>
          </Section>

          <Section title="4. Σκοποί επεξεργασίας">
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Δημιουργία και λειτουργία λογαριασμού</li>
              <li>Επικοινωνία υποστήριξης</li>
              <li>Διαβίβαση παραστατικών στη Wrapp (myDATA)</li>
              <li>Αναζήτηση ΑΦΜ μέσω ΓΓΠΣ (με τα διαπιστευτήριά σου)</li>
              <li>Χρέωση συνδρομής (μέσω παρόχου)</li>
              <li>Ασφάλεια, πρόληψη απάτης, τήρηση audit trail</li>
              <li>Συμμόρφωση με νομικές υποχρεώσεις</li>
            </ul>
          </Section>

          <Section title="5. Χρόνος τήρησης">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong>Δεδομένα λογαριασμού</strong>: για όσο διάστημα
                διατηρείς ενεργό λογαριασμό, συν 30 ημέρες μετά τη διαγραφή
                για ανάκτηση.
              </li>
              <li>
                <strong>Παραστατικά και λογιστικά αρχεία</strong>: ελάχιστα
                10 χρόνια σύμφωνα με τον Ν. 4308/2014 (ΕΛΠ) και τον Κώδικα
                Φορολογικών Διαδικασιών.
              </li>
              <li>
                <strong>Audit logs</strong>: 24 μήνες.
              </li>
              <li>
                <strong>Επικοινωνία υποστήριξης</strong>: 24 μήνες.
              </li>
              <li>
                <strong>Δεδομένα marketing</strong>: μέχρι ανάκληση
                συγκατάθεσης.
              </li>
            </ul>
          </Section>

          <Section title="6. Παραλήπτες & εκτελούντες την επεξεργασία">
            <p>
              Χρησιμοποιούμε τους παρακάτω τρίτους παρόχους ως εκτελούντες
              την επεξεργασία (Άρθρο 28 GDPR). Με κάθε έναν έχουμε συνάψει
              σύμβαση επεξεργασίας (DPA) που δεσμεύει τον πάροχο να
              χρησιμοποιεί τα δεδομένα αποκλειστικά για τους σκοπούς που
              καθορίζουμε. Οι δικές τους Πολιτικές Απορρήτου διέπουν την
              επεξεργασία που κάνουν στο πλαίσιο των υπηρεσιών τους — τις
              συνδέουμε παρακάτω για διαφάνεια.
            </p>

            <div className="mt-4 overflow-x-auto rounded-2xl border-2 border-black/10">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-brand-50/60">
                  <tr>
                    <th className="px-4 py-3 text-brand-900">Πάροχος</th>
                    <th className="px-4 py-3 text-brand-900">Ρόλος</th>
                    <th className="px-4 py-3 text-brand-900">Δεδομένα</th>
                    <th className="px-4 py-3 text-brand-900">Έδρα</th>
                    <th className="px-4 py-3 text-brand-900">DPA / Privacy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  <SubProcessorRow
                    name="Wrapp"
                    role="Πάροχος ΥΠΑΗΕΣ (myDATA)"
                    categories="Στοιχεία πελατών, ΑΦΜ, ποσά παραστατικών"
                    hq="Ελλάδα (ΕΕ)"
                    links={[{ label: "Site", href: "https://wrapp.ai" }]}
                  />
                  <SubProcessorRow
                    name="Brevo (πρώην Sendinblue)"
                    role="Transactional email"
                    categories="Email, ονοματεπώνυμο, περιεχόμενο μηνύματος"
                    hq="Γαλλία (ΕΕ)"
                    links={[
                      {
                        label: "Privacy",
                        href: "https://www.brevo.com/legal/privacypolicy/",
                      },
                      {
                        label: "DPA",
                        href: "https://www.brevo.com/legal/dpa/",
                      },
                    ]}
                  />
                  <SubProcessorRow
                    name="Google (OAuth)"
                    role="Προαιρετική ταυτοποίηση"
                    categories="Email, όνομα, avatar (αν εγκρίνεις)"
                    hq="ΗΠΑ (SCC 2021/914)"
                    links={[
                      {
                        label: "Privacy",
                        href: "https://policies.google.com/privacy",
                      },
                    ]}
                  />
                  <SubProcessorRow
                    name="Meta / Facebook (OAuth)"
                    role="Προαιρετική ταυτοποίηση"
                    categories="Email, όνομα (αν εγκρίνεις)"
                    hq="ΗΠΑ (SCC 2021/914)"
                    links={[
                      {
                        label: "Privacy",
                        href: "https://www.facebook.com/policy.php",
                      },
                    ]}
                  />
                  <SubProcessorRow
                    name="Sentry"
                    role="Παρακολούθηση σφαλμάτων"
                    categories="Stack traces, IP, user-agent"
                    hq="ΗΠΑ (SCC 2021/914)"
                    links={[
                      { label: "Privacy", href: "https://sentry.io/privacy/" },
                      { label: "DPA", href: "https://sentry.io/legal/dpa/" },
                    ]}
                  />
                  <SubProcessorRow
                    name="ΑΑΔΕ / ΓΓΠΣ"
                    role="Αναζήτηση ΑΦΜ"
                    categories="ΑΦΜ, δημόσια στοιχεία μητρώου"
                    hq="Ελλάδα (δημόσια αρχή)"
                    links={[{ label: "aade.gr", href: "https://www.aade.gr" }]}
                  />
                  <SubProcessorRow
                    name="Πάροχος cloud hosting"
                    role="Φιλοξενία εφαρμογής & βάσης δεδομένων"
                    categories="Όλα τα δεδομένα εφαρμογής"
                    hq="ΕΕ"
                    links={[{ label: "coolify.io", href: "https://coolify.io" }]}
                  />
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-sm text-black/60">
              Πέραν των παραπάνω, ενδέχεται να διαβιβάσουμε δεδομένα σε
              δημόσιες αρχές (π.χ. ΑΑΔΕ) όπου το επιβάλλει ο νόμος. Δεν
              πουλάμε και δεν μοιραζόμαστε προσωπικά δεδομένα για
              διαφημιστικούς σκοπούς.
            </p>
          </Section>

          <Section title="7. Διεθνείς διαβιβάσεις">
            <p>
              Τα δεδομένα σου παραμένουν, κατά κανόνα, εντός ΕΕ/ΕΟΧ. Σε
              περιπτώσεις που υπηρεσίες τρίτων (π.χ. Google, Facebook)
              διαβιβάζουν δεδομένα εκτός ΕΕ, γίνεται με τις τυποποιημένες
              συμβατικές ρήτρες της Επιτροπής (SCC 2021/914) ή άλλο
              αναγνωρισμένο μηχανισμό επάρκειας.
            </p>
          </Section>

          <Section title="8. Τα δικαιώματά σου (GDPR Άρθρα 15–22)">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong>Πρόσβαση</strong> — να λάβεις αντίγραφο των
                προσωπικών σου δεδομένων.
              </li>
              <li>
                <strong>Διόρθωση</strong> — να ζητήσεις διόρθωση ανακριβών
                δεδομένων.
              </li>
              <li>
                <strong>Διαγραφή</strong> — «δικαίωμα στη λήθη», όπου δεν
                αντιτίθεται νομική υποχρέωση.
              </li>
              <li>
                <strong>Περιορισμός</strong> — να περιορίσεις προσωρινά την
                επεξεργασία.
              </li>
              <li>
                <strong>Φορητότητα</strong> — να λάβεις τα δεδομένα σε
                δομημένη, μηχαναγνώσιμη μορφή.
              </li>
              <li>
                <strong>Εναντίωση</strong> — σε επεξεργασίες που στηρίζονται
                σε έννομο συμφέρον.
              </li>
              <li>
                <strong>Ανάκληση συγκατάθεσης</strong> — ανά πάσα στιγμή,
                χωρίς επίπτωση στη νομιμότητα προηγούμενης επεξεργασίας.
              </li>
              <li>
                <strong>Μη υποβολή σε αυτοματοποιημένη λήψη αποφάσεων</strong>{" "}
                — δεν παίρνουμε τέτοιες αποφάσεις σχετικά με σένα.
              </li>
            </ul>
            <p className="mt-3">
              Για άσκηση δικαιωμάτων στείλε email στο{" "}
              <a
                className="font-semibold text-brand-800 underline"
                href="mailto:support@timologion.gr"
              >
                support@timologion.gr
              </a>
              . Απαντάμε εντός 30 ημερών.
            </p>
          </Section>

          <Section title="9. Δικαίωμα καταγγελίας">
            <p>
              Εάν θεωρείς ότι η επεξεργασία των δεδομένων σου παραβιάζει τον
              νόμο, μπορείς να απευθυνθείς στην{" "}
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

          <Section title="10. Ασφάλεια">
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Encryption at rest (AES-256-GCM) για ευαίσθητα πεδία</li>
              <li>Encryption in transit (TLS 1.3)</li>
              <li>Κωδικοί hashed με Argon2id</li>
              <li>
                2FA email OTP για λογαριασμούς με ενεργοποιημένη προστασία
              </li>
              <li>Rate limiting σε ευαίσθητες ενέργειες</li>
              <li>Audit trail όλων των σημαντικών ενεργειών</li>
              <li>Regular backups & disaster recovery plan</li>
            </ul>
          </Section>

          <Section title="11. Ανήλικοι">
            <p>
              Η Υπηρεσία δεν απευθύνεται σε άτομα κάτω των 16 ετών (Άρθρο
              8 GDPR). Δεν συλλέγουμε εν γνώσει μας δεδομένα ανηλίκων. Αν
              διαπιστωθεί ότι δώσαμε λογαριασμό σε ανήλικο χωρίς γονική
              συγκατάθεση, διαγράφουμε αμέσως τα δεδομένα.
            </p>
          </Section>

          <Section title="12. Cookies">
            <p>
              Για αναλυτική περιγραφή δες την{" "}
              <a
                href="/cookies"
                className="font-semibold text-brand-800 underline"
              >
                Πολιτική Cookies
              </a>
              . Χρησιμοποιούμε αποκλειστικά τεχνικά αναγκαία cookies (session,
              CSRF, προτιμήσεις). Δεν χρησιμοποιούμε cookies διαφήμισης ή
              tracking τρίτων.
            </p>
          </Section>

          <Section title="13. Παραβίαση δεδομένων">
            <p>
              Σε περίπτωση παραβίασης προσωπικών δεδομένων που ενδέχεται να
              θέσει σε κίνδυνο τα δικαιώματα και τις ελευθερίες σου,
              ενημερώνουμε την ΑΠΔΠΧ εντός 72 ωρών και εσένα χωρίς
              αδικαιολόγητη καθυστέρηση, σύμφωνα με τα Άρθρα 33–34 GDPR.
            </p>
          </Section>

          <Section title="14. Αλλαγές στην πολιτική">
            <p>
              Ενδέχεται να ενημερώσουμε την παρούσα πολιτική. Ουσιώδεις
              αλλαγές γνωστοποιούνται με email τουλάχιστον 15 ημέρες πριν
              την εφαρμογή τους. Η ημερομηνία τελευταίας ενημέρωσης
              εμφανίζεται στην κορυφή.
            </p>
          </Section>

          <Section title="15. Επικοινωνία για δεδομένα">
            <p>
              Για κάθε αίτημα ή ερώτηση σχετικά με τα δεδομένα σου:{" "}
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

function SubProcessorRow({
  name,
  role,
  categories,
  hq,
  links,
}: {
  name: string;
  role: string;
  categories: string;
  hq: string;
  links: { label: string; href: string }[];
}) {
  return (
    <tr>
      <td className="px-4 py-3 font-semibold text-brand-900">{name}</td>
      <td className="px-4 py-3 text-black/70">{role}</td>
      <td className="px-4 py-3 text-black/70">{categories}</td>
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
