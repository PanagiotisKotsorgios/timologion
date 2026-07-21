import { redirect } from "next/navigation";
import { User, Shield, Monitor, AlertTriangle, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AccountForms } from "./AccountForms";
import { SessionsList } from "./SessionsList";
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
              title="Επαλήθευση σε δύο βήματα (2FA)"
              subtitle="Επιπλέον ασφάλεια με εφαρμογή Authenticator."
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
              action={<Shield size={16} className="text-ink-500" />}
            />
            <CardBody className="space-y-3 text-sm">
              <Row label="Email" value={user.email} />
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

          <Card>
            <CardHeader
              title="Επικίνδυνη ζώνη"
              action={<AlertTriangle size={16} className="text-red-600" />}
            />
            <CardBody>
              <AccountForms.Delete hasPassword={hasPassword} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-ink-200/60 pb-2 last:border-b-0 last:pb-0">
      <span className="text-ink-700">{label}</span>
      <span className="text-right font-semibold text-ink-900">{value}</span>
    </div>
  );
}
