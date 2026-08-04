import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { t } from "@/lib/i18n";
import { NewBookButton } from "./NewBookButton";
import { deleteBillingBookAction } from "./actions";
import type { DocumentType } from "@prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; page?: string };

const PAGE_SIZE = 20;

export default async function BillingBooksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");

  const { q, page } = await searchParams;
  const search = q?.trim() ?? "";
  const currentPage = Math.max(1, Number(page ?? "1") || 1);

  // Search matches on series code, label, or the Greek document-type
  // label. Since the type label lives in the i18n dict (not the DB),
  // we pre-compute which enum values match the query and OR them into
  // the where clause alongside the DB text fields.
  const matchingTypes: DocumentType[] = search
    ? (Object.entries(t.documents.types) as [DocumentType, string][])
        .filter(([, label]) =>
          label.toLowerCase().includes(search.toLowerCase()),
        )
        .map(([type]) => type)
    : [];

  const where = search
    ? {
        businessId: ctx.businessId,
        OR: [
          { series: { contains: search } },
          { label: { contains: search } },
          ...(matchingTypes.length > 0
            ? [{ documentType: { in: matchingTypes } }]
            : []),
        ],
      }
    : { businessId: ctx.businessId };

  const [books, total, branches] = await Promise.all([
    prisma.billingBook.findMany({
      where,
      orderBy: [{ documentType: "asc" }, { series: "asc" }],
      include: { branch: { select: { label: true } } },
      take: PAGE_SIZE,
      skip: (currentPage - 1) * PAGE_SIZE,
    }),
    prisma.billingBook.count({ where }),
    prisma.branch.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { label: "asc" },
      select: { id: true, label: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Σειρές παραστατικών"
        subtitle="Ορισμός σειρών για κάθε τύπο παραστατικού. Ο αριθμός εκδίδεται αυτόματα."
        actions={<NewBookButton branches={branches} />}
      />

      <form className="mb-4 max-w-md">
        <Input
          name="q"
          defaultValue={search}
          placeholder="Αναζήτηση σε τύπο, σειρά ή ετικέτα..."
        />
      </form>

      <Card>
        <CardHeader
          title={`Σειρές (${total.toLocaleString("el-GR")})`}
          subtitle={
            search
              ? `Αποτελέσματα για «${search}»`
              : "Μία προεπιλεγμένη ανά τύπο παραστατικού."
          }
        />
        <CardBody className="p-0">
          {books.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title={
                  search
                    ? `Καμία σειρά για «${search}»`
                    : "Δεν έχεις σειρές ακόμα."
                }
                description={
                  search
                    ? "Δοκίμασε άλλον όρο αναζήτησης."
                    : "Δημιούργησε μία από το κουμπί «Νέα σειρά» πάνω δεξιά."
                }
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
                    <tr
                      key={b.id}
                      className="transition-colors hover:bg-brand-50/40"
                    >
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

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-500">
            Σελίδα {currentPage} από {totalPages}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <LinkButton
                href={`/app/settings/billing-books?${new URLSearchParams({
                  ...(search ? { q: search } : {}),
                  page: String(currentPage - 1),
                }).toString()}`}
                variant="secondary"
                size="sm"
              >
                Προηγούμενη
              </LinkButton>
            )}
            {currentPage < totalPages && (
              <LinkButton
                href={`/app/settings/billing-books?${new URLSearchParams({
                  ...(search ? { q: search } : {}),
                  page: String(currentPage + 1),
                }).toString()}`}
                variant="secondary"
                size="sm"
              >
                Επόμενη
              </LinkButton>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
