import { redirect } from "next/navigation";
import { User, Shield, Monitor, AlertTriangle, ShieldCheck, Clock, Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AccountForms, DeleteAccountForm } from "./AccountForms";
import { SessionsList } from "./SessionsList";
import { SessionTimeoutForm } from "./SessionTimeoutForm";
import { listSessionsForCurrentUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        email: true,
        fullName: true,
        passwordHash: true,
        createdAt: true,
        mfaEnabled: true,
        sessionTimeoutMinutes: true,
        oauthAccounts: { select: { provider: true, email: true } },
      },
    }),
    listSessionsForCurrentUser(),
  ]);
  if (!user) redirect("/login");

  const hasPassword = Boolean(user.passwordHash);

  return (
    <>
      <PageHeader
        title="Ο λογαριασμός μου"
        subtitle="Στοιχεία σύνδεσης, ασφάλεια και διαχείριση συνεδριών."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Στοιχεία"
              action={<User size={16} className="text-ink-500" />}
            />
            <CardBody>
              <AccountForms
                email={user.email}
                fullName={user.fullName}
                hasPassword={hasPassword}
                oauthProviders={user.oauthAccounts.map((a) => a.provider)}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Ενεργές συνεδρίες"
              subtitle="Όλες οι συσκευές στις οποίες είσαι συνδεδεμένος αυτή τη στιγμή."
              action={<Monitor size={16} className="text-ink-500" />}
            />
            <CardBody className="p-0">
              <SessionsList sessions={sessions} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Αυτόματη αποσύνδεση"
              subtitle="Πόσο θέλεις να μείνει ανοιχτή η συνεδρία σου χωρίς δραστηριότητα."
              action={<Clock size={16} className="text-ink-500" />}
            />
            <CardBody>
              <SessionTimeoutForm
                currentMinutes={user.sessionTimeoutMinutes}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Επαλήθευση σε δύο βήματα (2FA)"
              subtitle="Επιπλέον ασφάλεια με 6-ψήφιο κωδικό στο email."
              action={
                user.mfaEnabled ? (
                  <Badge tone="success">Ενεργό</Badge>
                ) : (
                  <Badge tone="muted">Ανενεργό</Badge>
                )
              }
            />
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-700">
                  {user.mfaEnabled
                    ? "Ο λογαριασμός σου προστατεύεται με 2FA."
                    : "Ενεργοποίησε το 2FA για να προστατέψεις τη σύνδεσή σου."}
                </p>
                <LinkButton
                  href="/app/settings/account/2fa"
                  variant="secondary"
                  size="sm"
                  icon={ShieldCheck}
                >
                  {user.mfaEnabled ? "Διαχείριση 2FA" : "Ενεργοποίηση 2FA"}
                </LinkButton>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Λογαριασμός"
              action={<Shield size={18} className="text-ink-500" />}
            />
            <CardBody className="space-y-5 p-6 md:p-8">
              <Row label="Email" value={user.email} mono />
              <Row label="Ονοματεπώνυμο" value={user.fullName} />
              <Row
                label="Μέθοδοι σύνδεσης"
                value={
                  [
                    hasPassword ? "Email + κωδικός" : null,
                    ...user.oauthAccounts.map((a) =>
                      a.provider === "google" ? "Google" : "Facebook",
                    ),
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
              <Row
                label="Δημιουργήθηκε"
                value={user.createdAt.toLocaleDateString("el-GR")}
              />
            </CardBody>
          </Card>

          {/* GDPR Άρθρο 20 — δικαίωμα φορητότητας. Self-service
              download of every field the app holds on this user, in a
              machine-readable JSON bundle. Rendered as a plain link
              (not a fetch button) so the browser handles the download
              through the standard Save dialog — no UI freeze, no
              disabled-during-download state. Intentionally understated
              so the average user isn't distracted by legal jargon:
              the section carries a short explainer, the CTA is a
              single download button. */}
          <Card>
            <CardHeader
              title="Τα δεδομένα μου"
              subtitle="Λήψη των προσωπικών σου δεδομένων σε αρχείο JSON (GDPR άρθρο 20)."
              action={<Download size={16} className="text-ink-500" />}
            />
            <CardBody>
              <p className="text-sm text-ink-700">
                Λαμβάνεις σε ένα αρχείο τα στοιχεία λογαριασμού, τις
                συνδεδεμένες επιχειρήσεις, τις ενεργές συνεδρίες και το
                ιστορικό ενεργειών σου. Παραστατικά και πελατολόγιο
                εξάγονται σε Excel/PDF από τις αντίστοιχες σελίδες.
              </p>
              <a
                href="/api/user/gdpr-export"
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg border-2 border-brand-800 bg-white px-4 text-sm font-bold text-brand-900 transition-colors hover:bg-brand-50"
                download
              >
                <Download size={14} strokeWidth={2.5} aria-hidden />
                Λήψη δεδομένων μου (JSON)
              </a>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Επικίνδυνη ζώνη"
              action={<AlertTriangle size={16} className="text-red-600" />}
            />
            <CardBody>
              <DeleteAccountForm hasPassword={hasPassword} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="border-b-2 border-ink-200/60 pb-4 last:border-b-0 last:pb-0">
      <p className="text-xs font-bold uppercase tracking-widest text-ink-500">
        {label}
      </p>
      <p
        className={
          "mt-2 break-all text-lg font-semibold leading-snug text-ink-900 " +
          (mono ? "mono text-base" : "")
        }
      >
        {value}
      </p>
    </div>
  );
}
