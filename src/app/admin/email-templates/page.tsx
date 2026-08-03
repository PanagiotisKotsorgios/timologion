import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TemplateEditor } from "./TemplateEditor";

export const dynamic = "force-dynamic";

/**
 * Known template keys mirror the code-side keys in src/lib/email/templates.ts.
 * When a row exists here, the send layer prefers the DB copy. When not,
 * the hardcoded template is used — safe fallback.
 */
const KNOWN_KEYS: Array<{ key: string; description: string }> = [
  { key: "welcome", description: "Καλωσόρισμα μετά την εγγραφή" },
  { key: "email_verify", description: "Σύνδεσμος επιβεβαίωσης email" },
  { key: "password_reset", description: "Σύνδεσμος επαναφοράς κωδικού" },
  { key: "invite_member", description: "Πρόσκληση μέλους σε επιχείρηση" },
  { key: "invoice_ready", description: "Έκδοση παραστατικού προς πελάτη" },
];

export default async function AdminEmailTemplatesPage() {
  await requireAdmin("super_admin");

  const existing = await prisma.emailTemplate.findMany({
    orderBy: { updatedAt: "desc" },
  });
  const map = new Map(existing.map((t) => [t.key, t]));

  return (
    <>
      <PageHeader
        title="Πρότυπα email"
        subtitle="Επεξεργάσιμα HTML περιεχόμενα για τα transactional emails."
      />

      <div className="space-y-6">
        {KNOWN_KEYS.map((k) => {
          const row = map.get(k.key);
          return (
            <Card key={k.key}>
              <CardHeader
                title={k.key}
                subtitle={k.description}
                action={
                  <Badge tone={row ? "success" : "muted"}>
                    {row ? "custom" : "default (κώδικας)"}
                  </Badge>
                }
              />
              <CardBody>
                <TemplateEditor
                  templateKey={k.key}
                  description={k.description}
                  initialSubject={row?.subject ?? ""}
                  initialBody={row?.bodyHtml ?? ""}
                  hasOverride={!!row}
                  updatedAt={row?.updatedAt.toISOString() ?? null}
                />
              </CardBody>
            </Card>
          );
        })}
      </div>
    </>
  );
}
