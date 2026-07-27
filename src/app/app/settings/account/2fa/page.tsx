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
        subtitle="Στέλνουμε 6-ψήφιο κωδικό στο email σου κάθε φορά που συνδέεσαι."
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
              Δεν χρειάζεται εφαρμογή Authenticator ή QR code. Κάθε φορά που
              συνδέεσαι:
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-ink-700">
              <li>Δίνεις το email και τον κωδικό σου</li>
              <li>Σου στέλνουμε 6-ψήφιο κωδικό στα εισερχόμενά σου</li>
              <li>Τον πληκτρολογείς για να ολοκληρώσεις τη σύνδεση</li>
            </ol>
            <p className="text-xs text-ink-500">
              Ο κωδικός λήγει σε 10 λεπτά. Χρειάζεται πρόσβαση στο email σου
              για να συνδεθείς — φύλαξέ το ασφαλές.
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
