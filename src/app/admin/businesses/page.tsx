import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { money, date } from "@/lib/format";

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

  return (
    <>
      <PageHeader
        title="Επιχειρήσεις"
        subtitle={`${total} επιχειρήσεις συνολικά στην πλατφόρμα`}
      />

      <form className="mb-4 max-w-md">
        <Input
          name="q"
          defaultValue={search}
          placeholder="Αναζήτηση σε επωνυμία ή ΑΦΜ..."
        />
      </form>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-2 text-left">Επιχείρηση</th>
              <th className="px-4 py-2 text-left">ΑΦΜ</th>
              <th className="px-4 py-2 text-left">Πόλη</th>
              <th className="px-4 py-2 text-right">Μέλη</th>
              <th className="px-4 py-2 text-right">Παραστ.</th>
              <th className="px-4 py-2 text-right">Έσοδα</th>
              <th className="px-4 py-2 text-left">Πάροχος</th>
              <th className="px-4 py-2 text-left">Ημ/νία</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-300/60">
            {rows.map((b) => {
              const revenue = b.documents
                .filter((d) => d.status === "issued")
                .reduce((s, d) => s + Number(d.totalAmount), 0);
              return (
                <tr key={b.id} className="hover:bg-ink-100/60">
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/businesses/${b.id}`}
                      className="font-medium text-brand-700 hover:text-brand-800"
                    >
                      {b.tradeName ?? b.legalName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-ink-700">{b.vatNumber}</td>
                  <td className="px-4 py-2 text-ink-700">{b.city ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{b._count.members}</td>
                  <td className="px-4 py-2 text-right">
                    {b._count.documents}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {money(revenue)}
                  </td>
                  <td className="px-4 py-2">
                    <WrappBadge status={b.wrappConnection?.status} />
                  </td>
                  <td className="px-4 py-2 text-ink-500">
                    {date(b.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

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

function WrappBadge({ status }: { status?: string }) {
  if (!status || status === "inactive")
    return <Badge tone="muted">Ανενεργός</Badge>;
  if (status === "active") return <Badge tone="success">Ενεργός</Badge>;
  if (status === "pending") return <Badge tone="warning">Σε αναμονή</Badge>;
  return <Badge tone="danger">Σφάλμα</Badge>;
}
