import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Shield } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TwoFAEnroll } from "./TwoFAEnroll";
import { TwoFADisable } from "./TwoFADisable";

export const dynamic = "force-dynamic";

export default async function TwoFactorPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      passwordHash: true,
      mfaEnabled: true,
      mfaVerifiedAt: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <>
      <PageHeader
        title="Επαλήθευση σε δύο βήματα (2FA)"
        subtitle="Χρησιμοποίησε εφαρμογή Authenticator για να προστατέψεις τη σύνδεσή σου."
        actions={
          <LinkButton
            href="/app/settings/account"
            variant="secondary"
            icon={ArrowLeft}
          >
            Πίσω στον λογαριασμό
          </LinkButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title={
                user.mfaEnabled ? "Ενεργό 2FA" : "Ενεργοποίηση 2FA"
              }
              action={
                user.mfaEnabled ? (
                  <Badge tone="success">Ενεργό</Badge>
                ) : (
                  <Badge tone="muted">Ανενεργό</Badge>
                )
              }
            />
            <CardBody>
              {user.mfaEnabled ? (
                <TwoFADisable hasPassword={Boolean(user.passwordHash)} />
              ) : (
                <TwoFAEnroll />
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="Οδηγίες"
            action={
              user.mfaEnabled ? (
                <ShieldCheck size={16} className="text-emerald-700" />
              ) : (
                <Shield size={16} className="text-ink-500" />
              )
            }
          />
          <CardBody className="space-y-3 text-sm text-ink-900">
            <p>
              Κατέβασε μια εφαρμογή Authenticator στο κινητό σου.
              Προτεινόμενες:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-ink-700">
              <li>Google Authenticator</li>
              <li>Microsoft Authenticator</li>
              <li>Authy</li>
              <li>1Password / Bitwarden</li>
            </ul>
            <p className="text-xs text-ink-500">
              Το κλειδί αποθηκεύεται κρυπτογραφημένο (AES-256-GCM). Ο κωδικός
              6-ψηφίων ανανεώνεται κάθε 30 δευτερόλεπτα και δεν αποθηκεύεται
              ποτέ.
            </p>
            {user.mfaVerifiedAt && (
              <p className="text-xs text-ink-500">
                Ενεργοποιήθηκε: {user.mfaVerifiedAt.toLocaleDateString("el-GR")}
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      <p className="mt-6 text-sm text-ink-500">
        Ενδιαφέρεσαι για{" "}
        <Link href="/app/settings/account" className="underline">
          άλλες ρυθμίσεις λογαριασμού
        </Link>
        ; Δες τη σελίδα του λογαριασμού σου.
      </p>
    </>
  );
}
