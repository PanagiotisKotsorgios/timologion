import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { t } from "@/lib/i18n";
import { BookForm } from "./BookForm";
import { deleteBillingBookAction } from "./actions";

export default async function BillingBooksPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");

  const [books, branches] = await Promise.all([
    prisma.billingBook.findMany({
      where: { businessId: ctx.businessId },
      orderBy: [{ documentType: "asc" }, { series: "asc" }],
      include: { branch: { select: { label: true } } },
    }),
    prisma.branch.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { label: "asc" },
      select: { id: true, label: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Σειρές παραστατικών"
        subtitle="Ορισμός σειρών για κάθε τύπο παραστατικού. Ο αριθμός εκδίδεται αυτόματα."
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader
              title={`Σειρές (${books.length})`}
              subtitle="Μία προεπιλεγμένη ανά τύπο παραστατικού."
            />
            <CardBody className="p-0">
              {books.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="Δεν έχεις σειρές ακόμα."
                    description="Δημιούργησε μία από το πλάι για να ξεκινήσεις."
                  />
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Τύπος</th>
                      <th className="px-4 py-2 text-left">Σειρά</th>
                      <th className="px-4 py-2 text-left">Υποκατάστημα</th>
                      <th className="px-4 py-2 text-right">Επόμενος #</th>
                      <th className="px-4 py-2 text-right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-300/60">
                    {books.map((b) => (
                      <tr key={b.id}>
                        <td className="px-4 py-2">
                          {t.documents.types[b.documentType]}
                        </td>
                        <td className="px-4 py-2">
                          <span className="font-medium text-ink-900">
                            {b.series}
                          </span>
                          {b.isDefault && (
                            <Badge tone="brand">Προεπιλογή</Badge>
                          )}
                          {b.label && (
                            <div className="text-xs text-ink-500">
                              {b.label}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-ink-700">
                          {b.branch?.label ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {b.nextNumber}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <form action={deleteBillingBookAction}>
                            <input type="hidden" name="id" value={b.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                            >
                              Διαγραφή
                            </Button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Νέα σειρά" />
          <CardBody>
            <BookForm branches={branches} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
