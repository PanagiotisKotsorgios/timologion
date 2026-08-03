import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

/**
 * Internal docs — runbook + onboarding for support staff. Rendered
 * as static JSX because we don't ship a markdown parser, and the
 * content is stable enough that editing it as JSX is fine.
 */
export default async function AdminDocsPage() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Runbook & Onboarding"
        subtitle="Εσωτερικές οδηγίες για την ομάδα υποστήριξης."
      />

      <div className="grid gap-6 md:grid-cols-4">
        <nav className="md:col-span-1">
          <div className="sticky top-6 space-y-1 text-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
              Περιεχόμενα
            </p>
            <Toc
              items={[
                ["#onboarding", "1. Onboarding για support"],
                ["#tools", "2. Που βρίσκεται τι"],
                ["#playbooks", "3. Playbooks"],
                ["#p-issue", "3.1 Παραστατικό δεν εκδίδεται"],
                ["#p-pay", "3.2 Πληρωμή απέτυχε"],
                ["#p-lock", "3.2 Locked/suspended user"],
                ["#p-oauth", "3.4 OAuth login πρόβλημα"],
                ["#p-restore", "3.5 Ανάγκη restore backup"],
                ["#p-abuse", "3.6 Ύποπτη δραστηριότητα"],
                ["#escalation", "4. Escalation matrix"],
                ["#hygiene", "5. Καθημερινή hygiene"],
              ]}
            />
          </div>
        </nav>

        <div className="space-y-8 md:col-span-3">
          <Section id="onboarding" title="1. Onboarding για support">
            <p>
              Καλωσόρισες. Ο ρόλος σου είναι να διαχειρίζεσαι tickets, να
              καθοδηγείς πελάτες στα onboarding steps του παρόχου (Wrapp),
              και να συντονίζεσαι με το engineering όταν κάτι δεν λύνεται με
              τα εργαλεία εδώ.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>
                Ζήτα από τον super_admin να σου κάνει promote σε ρόλο{" "}
                <code className="mono text-xs">support</code> από{" "}
                <a
                  href="/admin/admins"
                  className="font-bold text-brand-800 hover:text-brand-900"
                >
                  /admin/admins
                </a>
                .
              </li>
              <li>
                Ενεργοποίησε 2FA στη σελίδα{" "}
                <a
                  href="/app/settings/security"
                  className="font-bold text-brand-800 hover:text-brand-900"
                >
                  Security
                </a>
                . Αν το{" "}
                <code className="mono text-xs">ADMIN_REQUIRE_2FA</code> είναι
                on, χωρίς αυτό δεν μπαίνεις στο /admin.
              </li>
              <li>
                Διάβασε τη σελίδα{" "}
                <a
                  href="/admin/health"
                  className="font-bold text-brand-800 hover:text-brand-900"
                >
                  /admin/health
                </a>{" "}
                μια φορά — καταλαβαίνεις σε λίγα λεπτά τι είναι OK και τι όχι.
              </li>
              <li>
                Άνοιξε το{" "}
                <a
                  href="/admin/tickets"
                  className="font-bold text-brand-800 hover:text-brand-900"
                >
                  ticket inbox
                </a>{" "}
                με φίλτρο "Χωρίς owner" και ανάθεσε τα σε εσένα καθώς τα πιάνεις.
              </li>
            </ul>
          </Section>

          <Section id="tools" title="2. Που βρίσκεται τι">
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong>Επιχειρήσεις:</strong>{" "}
                <a href="/admin/businesses" className="font-bold text-brand-800">
                  /admin/businesses
                </a>{" "}
                → detail page έχει suspend, tags/notes, feature flags,
                subscription, provider cost, platform invoicing.
              </li>
              <li>
                <strong>Χρήστες:</strong>{" "}
                <a href="/admin/users" className="font-bold text-brand-800">
                  /admin/users
                </a>{" "}
                → detail έχει impersonate (super_admin), ban/unban,
                logout-παντού, revoke session, reset link, GDPR export.
              </li>
              <li>
                <strong>Support tickets:</strong>{" "}
                <a href="/admin/tickets" className="font-bold text-brand-800">
                  /admin/tickets
                </a>{" "}
                → όλα τα ανοικτά + απάντηση απευθείας μέσω email.
              </li>
              <li>
                <strong>Οικονομικά:</strong>{" "}
                <a href="/admin/metrics" className="font-bold text-brand-800">
                  /admin/metrics
                </a>{" "}
                (MRR/ARR),{" "}
                <a href="/admin/billing" className="font-bold text-brand-800">
                  /admin/billing
                </a>{" "}
                (revenue history),{" "}
                <a href="/admin/reports" className="font-bold text-brand-800">
                  /admin/reports
                </a>{" "}
                (XLSX exports).
              </li>
              <li>
                <strong>Cron/backups:</strong>{" "}
                <a href="/admin/cron" className="font-bold text-brand-800">
                  /admin/cron
                </a>
                ,{" "}
                <a href="/admin/backups" className="font-bold text-brand-800">
                  /admin/backups
                </a>
                .
              </li>
              <li>
                <strong>Wrapp:</strong>{" "}
                <a href="/admin/wrapp" className="font-bold text-brand-800">
                  /admin/wrapp
                </a>{" "}
                (config),{" "}
                <a href="/admin/webhooks" className="font-bold text-brand-800">
                  /admin/webhooks
                </a>{" "}
                (event log).
              </li>
              <li>
                <strong>Ops:</strong>{" "}
                <a href="/admin/ops" className="font-bold text-brand-800">
                  /admin/ops
                </a>{" "}
                — dunning, stuck users, onboarding incomplete, admin activity,
                Wrapp usage.
              </li>
            </ul>
          </Section>

          <Section id="playbooks" title="3. Playbooks">
            <Sub id="p-issue" title="3.1 Παραστατικό δεν εκδίδεται">
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>
                  Άνοιξε το{" "}
                  <code className="mono text-xs">/admin/webhooks</code> και ψάξε
                  με το partner_user_id του τενant. Αν λείπει issued-invoice
                  event, δεν έφτασε στη Wrapp.
                </li>
                <li>
                  Δες το{" "}
                  <code className="mono text-xs">/admin/errors</code> filtered
                  by <em>path=/app/documents/*</em>. Αν υπάρχει fingerprint που
                  τρέχει πολύ, escalate στο engineering.
                </li>
                <li>
                  Ελέγξε στη σελίδα της επιχείρησης το Wrapp status. Αν{" "}
                  <em>Ανενεργό</em>, ο πελάτης πρέπει να ολοκληρώσει onboarding
                  στο <a href="https://wrapp.ai">wrapp.ai</a>.
                </li>
                <li>
                  Ενημέρωσε τον πελάτη με το playbook link και άφησέ του
                  ticket αν χρειάζεται follow-up.
                </li>
              </ol>
            </Sub>

            <Sub id="p-pay" title="3.2 Πληρωμή συνδρομής απέτυχε (past_due)">
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>
                  Άνοιξε <code className="mono text-xs">/admin/ops</code> → κάρτα
                  "Past-due συνδρομές".
                </li>
                <li>
                  Θυμήσου: <strong>δεν χρεώνουμε εμείς</strong>. Η χρέωση
                  γίνεται από Wrapp/Stripe. Πες στον πελάτη να μπει στο
                  δικό του λογαριασμό Wrapp και να ανανεώσει την κάρτα.
                </li>
                <li>
                  Αν επιμένει το πρόβλημα, στείλε ticket στη Wrapp support —
                  δεν έχουμε πρόσβαση στα billing details τους.
                </li>
              </ol>
            </Sub>

            <Sub id="p-lock" title="3.3 Locked/suspended user ή business">
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>
                  Πήγαινε στο user/business detail. Δες την ημερομηνία
                  suspend + την αιτιολογία (audit log).
                </li>
                <li>
                  Αν ήταν καταχρηστικό ή έχει διορθωθεί → κουμπί "Άρση
                  αναστολής". Επισύναψε internal note στο business
                  <em>supportNotes</em>.
                </li>
                <li>
                  Αν χρειάζεται και reset session → "Logout παντού" από
                  user detail.
                </li>
              </ol>
            </Sub>

            <Sub id="p-oauth" title="3.4 OAuth login πρόβλημα">
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>
                  Δες αν το <code className="mono text-xs">/admin/errors</code>{" "}
                  έχει fingerprint <em>oauth</em>. Συνήθως δείχνει token
                  expiry ή αλλαγή provider config.
                </li>
                <li>
                  Ρώτησε τον πελάτη να δοκιμάσει email+password login μέχρι
                  να λυθεί. Εναλλακτικά reset link από user detail.
                </li>
                <li>
                  Αν είναι widespread → escalate. Πιθανό Google/Facebook client
                  secret rotation.
                </li>
              </ol>
            </Sub>

            <Sub id="p-restore" title="3.5 Χρειάζεται restore από backup">
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>
                  Escalate σε super_admin. Restore <strong>ΔΕΝ</strong>{" "}
                  γίνεται από support.
                </li>
                <li>
                  Στο{" "}
                  <a href="/admin/backups" className="font-bold text-brand-800">
                    /admin/backups
                  </a>{" "}
                  βρες το τελευταίο success και σημείωσε το target S3 key.
                </li>
                <li>
                  Πες στον πελάτη ότι restore σε παλιότερη κατάσταση σβήνει
                  ό,τι έχει γίνει έκτοτε — <em>irreversible</em>.
                </li>
                <li>
                  Δες το{" "}
                  <code className="mono text-xs">docs/BACKUP.md</code> για τη
                  διαδικασία.
                </li>
              </ol>
            </Sub>

            <Sub id="p-abuse" title="3.6 Ύποπτη δραστηριότητα">
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>
                  Δες audit log του user στο{" "}
                  <code className="mono text-xs">/admin/users/[id]</code>.
                </li>
                <li>
                  Αν υπάρχει pattern (μαζικές δημιουργίες παραστατικών,
                  αλλαγές πελατών, κ.λπ.) → suspend τον χρήστη προσωρινά
                  με αιτιολογία και άνοιξε ticket με engineering.
                </li>
                <li>
                  Για rate limit clamping → πρόσθεσε override στο{" "}
                  <a href="/admin/rate-limits" className="font-bold text-brand-800">
                    /admin/rate-limits
                  </a>{" "}
                  αντί να απαγορεύσεις εντελώς.
                </li>
              </ol>
            </Sub>
          </Section>

          <Section id="escalation" title="4. Escalation matrix">
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Wrapp/myDATA outage:</strong> Wrapp support · docs στο
                wrapp.ai
              </li>
              <li>
                <strong>Restore, migration, schema changes:</strong> super_admin
              </li>
              <li>
                <strong>Legal / DPO:</strong> support@timologion.gr με[ΝΟΜΙΚΟ] στο θέμα
              </li>
              <li>
                <strong>Coolify/infra:</strong> super_admin (μόνο αυτός έχει
                access στο dashboard)
              </li>
              <li>
                <strong>Security incident:</strong> αμέσως super_admin +
                άνοιξε ticket με priority 1
              </li>
            </ul>
          </Section>

          <Section id="hygiene" title="5. Καθημερινή hygiene">
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Έλεγξε{" "}
                <a href="/admin/health" className="font-bold text-brand-800">
                  /admin/health
                </a>{" "}
                — όλα OK; αν όχι, snapshot το πρόβλημα σε ticket.
              </li>
              <li>
                Ανάθεσε νέα tickets σε εσένα ή σε συνάδελφο. Χωρίς owner ==
                χωρίς SLA.
              </li>
              <li>
                Σε past_due συνδρομές → μια φορά την εβδομάδα προσωπικό ping στον
                πελάτη.
              </li>
              <li>
                Αν{" "}
                <code className="mono text-xs">/admin/errors</code> δείχνει
                σφάλματα &gt; 25/ώρα → escalate.
              </li>
              <li>
                <a href="/admin/integrity" className="font-bold text-brand-800">
                  /admin/integrity
                </a>{" "}
                — τρέξε τους ασφαλείς καθαρισμούς μια φορά την εβδομάδα.
              </li>
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-6">
      <Card>
        <CardHeader title={title} />
        <CardBody className="space-y-3 leading-relaxed">{children}</CardBody>
      </Card>
    </div>
  );
}

function Sub({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="rounded-xl border-2 border-ink-200 bg-ink-50/40 p-4">
      <h3 className="text-base font-bold text-brand-900">{title}</h3>
      <div className="mt-1 text-sm text-ink-900">{children}</div>
    </div>
  );
}

function Toc({ items }: { items: [string, string][] }) {
  return (
    <ul className="space-y-1">
      {items.map(([href, label]) => (
        <li key={href}>
          <a
            href={href}
            className="block rounded-md px-2 py-1 text-ink-700 hover:bg-ink-100 hover:text-brand-900"
          >
            {label}
          </a>
        </li>
      ))}
    </ul>
  );
}
