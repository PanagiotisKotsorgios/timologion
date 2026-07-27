import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { t } from "@/lib/i18n";
import { NewBookButton } from "./NewBookButton";
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
        actions={<NewBookButton branches={branches} />}
      />

      <Card>
        <CardHeader
          title={`Σειρές (${books.length})`}
          subtitle="Μία προεπιλεγμένη ανά τύπο παραστατικού."
        />
        <CardBody className="p-0">
          {books.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="Δεν έχεις σειρές ακόμα."
                description="Δημιούργησε μία από το κουμπί «Νέα σειρά» πάνω δεξιά."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b-2 border-ink-300 bg-ink-50 text-sm font-bold uppercase tracking-widest text-ink-500">
                  <tr>
                    <th className="px-6 py-4 text-left">Τύπος</th>
                    <th className="px-6 py-4 text-left">Σειρά</th>
                    <th className="px-6 py-4 text-left">Υποκατάστημα</th>
                    <th className="px-6 py-4 text-right">Επόμενος #</th>
                    <th className="px-6 py-4 text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink-200/70 text-base">
                  {books.map((b) => (
                    <tr key={b.id} className="transition-colors hover:bg-brand-50/40">
                      <td className="px-6 py-4 font-semibold text-ink-900">
                        {t.documents.types[b.documentType]}
                      </td>
                      <td className="px-6 py-4">
                        <span className="mono text-xl font-extrabold text-brand-900">
                          {b.series}
                        </span>
                        {b.isDefault && (
                          <span className="ml-2 inline-flex align-middle">
                            <Badge tone="brand">Προεπιλογή</Badge>
                          </span>
                        )}
                        {b.label && (
                          <div className="mt-1 text-sm text-ink-500">
                            {b.label}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-ink-700">
                        {b.branch?.label ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-right mono text-lg font-bold text-ink-900">
                        {b.nextNumber}
                      </td>
                      <td className="px-6 py-4 text-right">
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
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
