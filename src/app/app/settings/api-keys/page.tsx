import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { CreateKeyForm } from "./CreateKeyForm";
import { revokeKeyAction } from "./actions";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");

  const keys = await prisma.apiKey.findMany({
    where: { businessId: ctx.businessId },
    orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
  });

  return (
    <>
      <PageHeader
        title="API keys"
        subtitle="Bearer tokens για προγραμματιστική πρόσβαση στην επιχείρησή σου."
      />

      <Alert tone="info">
        Το κλειδί εμφανίζεται <strong>μόνο μία φορά</strong> στη δημιουργία —
        αποθήκευσέ το σε ασφαλές μέρος. Χάθηκε; Δημιούργησε νέο και revoke το
        παλιό. Base URL API:{" "}
        <code className="mono text-xs">
          {env.APP_BASE_URL.replace(/\/$/, "")}/api/public
        </code>
      </Alert>

      <Card className="mt-6">
        <CardHeader
          title="Νέο κλειδί"
          subtitle="Δώσε όνομα ώστε να ξεχωρίζεις integrations."
        />
        <CardBody>
          <CreateKeyForm />
        </CardBody>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title={`Ενεργά + ιστορικό (${keys.length})`} />
        <CardBody className="p-0">
          {keys.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink-500">
              Δεν έχεις δημιουργήσει κανένα κλειδί.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-2 text-left">Όνομα</th>
                  <th className="px-4 py-2 text-left">Prefix</th>
                  <th className="px-4 py-2 text-left">Τελ. χρήση</th>
                  <th className="px-4 py-2 text-left">Κατάσταση</th>
                  <th className="px-4 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-300/60">
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td className="px-4 py-2 font-medium text-ink-900">
                      {k.name}
                    </td>
                    <td className="px-4 py-2 mono text-xs text-ink-700">
                      {k.prefix}…
                    </td>
                    <td className="px-4 py-2 text-ink-500 text-xs">
                      {k.lastUsedAt
                        ? k.lastUsedAt.toLocaleString("el-GR")
                        : "Ποτέ"}
                    </td>
                    <td className="px-4 py-2">
                      {k.revokedAt ? (
                        <Badge tone="muted">Revoked</Badge>
                      ) : (
                        <Badge tone="success">Ενεργό</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {!k.revokedAt && (
                        <form action={revokeKeyAction}>
                          <input type="hidden" name="id" value={k.id} />
                          <button
                            type="submit"
                            className="text-xs font-bold text-red-700 hover:text-red-900"
                          >
                            Revoke
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </>
  );
}
