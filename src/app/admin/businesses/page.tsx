import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { LinkButton } from "@/components/ui/Button";
import { AdminExportButton } from "@/components/admin/AdminExportButton";
import { BulkTable } from "./BulkTable";

type SearchParams = { q?: string; page?: string };

const PAGE_SIZE = 30;

export const dynamic = "force-dynamic";

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const { q, page } = await searchParams;
  const search = q?.trim() ?? "";
  const currentPage = Math.max(1, Number(page ?? "1") || 1);

  const where = search
    ? {
        OR: [
          { legalName: { contains: search } },
          { tradeName: { contains: search } },
          { vatNumber: { contains: search } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.business.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (currentPage - 1) * PAGE_SIZE,
      select: {
        id: true,
        legalName: true,
        tradeName: true,
        vatNumber: true,
        city: true,
        createdAt: true,
        suspendedAt: true,
        wrappConnection: { select: { status: true } },
        _count: { select: { members: true, documents: true } },
        documents: {
          select: { totalAmount: true, status: true },
        },
      },
    }),
    prisma.business.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tableRows = rows.map((b) => ({
    id: b.id,
    legalName: b.legalName,
    tradeName: b.tradeName,
    vatNumber: b.vatNumber,
    city: b.city,
    createdAt: b.createdAt.toISOString(),
    suspendedAt: b.suspendedAt?.toISOString() ?? null,
    members: b._count.members,
    documents: b._count.documents,
    revenue: b.documents
      .filter((d) => d.status === "issued")
      .reduce((s, d) => s + Number(d.totalAmount), 0),
    wrappStatus: b.wrappConnection?.status ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Επιχειρήσεις"
        subtitle={`${total} επιχειρήσεις συνολικά · Επιλογή γραμμών για bulk actions`}
        actions={<AdminExportButton entity="businesses" params={{ q: search }} />}
      />

      <form className="mb-4 max-w-md">
        <Input
          name="q"
          defaultValue={search}
          placeholder="Αναζήτηση σε επωνυμία ή ΑΦΜ..."
        />
      </form>

      <BulkTable rows={tableRows} />

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-500">
            Σελίδα {currentPage} / {totalPages}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <LinkButton
                href={`/admin/businesses?${new URLSearchParams({ q: search, page: String(currentPage - 1) })}`}
                variant="secondary"
                size="sm"
              >
                Προηγούμενη
              </LinkButton>
            )}
            {currentPage < totalPages && (
              <LinkButton
                href={`/admin/businesses?${new URLSearchParams({ q: search, page: String(currentPage + 1) })}`}
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
