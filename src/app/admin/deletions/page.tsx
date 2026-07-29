import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { date } from "@/lib/format";

type SearchParams = { q?: string; page?: string };

const PAGE_SIZE = 40;

export const dynamic = "force-dynamic";

/**
 * Platform-admin log of every account deletion. Populated by
 * deleteAccountAction on the user side — the snapshot column carries
 * the full JSON payload (contact, businesses, document counts) so
 * support can answer "what happened to X?" long after the User row
 * is gone.
 */
export default async function AdminDeletionsPage({
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
          { userEmail: { contains: search } },
          { userFullName: { contains: search } },
          { reason: { contains: search } },
        ],
      }
    : {};

  const [rows, total, aggByMonth] = await Promise.all([
    prisma.accountDeletionLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (currentPage - 1) * PAGE_SIZE,
    }),
    prisma.accountDeletionLog.count({ where }),
    prisma.accountDeletionLog.aggregate({
      _sum: { businessesDeleted: true, documentsRetained: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Διαγραφές λογαριασμών"
        subtitle={`${total} καταχωρήσεις · ${
          aggByMonth._sum.businessesDeleted ?? 0
        } επιχειρήσεις διαγράφηκαν συνολικά`}
      />

      <form method="get" className="mb-6 flex flex-wrap gap-3">
        <Input
          name="q"
          defaultValue={search}
          placeholder="Αναζήτηση σε email, όνομα ή λόγο..."
          className="max-w-md"
        />
        <button
          type="submit"
          className="inline-flex h-12 items-center rounded-lg border-2 border-ink-300 bg-white px-5 text-sm font-bold"
        >
          Αναζήτηση
        </button>
      </form>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <CardBody>
            <EmptyState
              title="Καμία διαγραφή ακόμα"
              description="Οι διαγραφές λογαριασμών θα εμφανίζονται εδώ αμέσως μόλις γίνουν."
            />
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ημ/νία</th>
                  <th>Email</th>
                  <th>Όνομα</th>
                  <th className="text-right">Επιχειρήσεις</th>
                  <th className="text-right">Παραστατικά</th>
                  <th>Λόγος</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="mono text-sm">{date(r.createdAt)}</td>
                    <td>
                      <a
                        href={`/admin/deletions/${r.id}`}
                        className="font-semibold text-brand-800 hover:text-brand-900"
                      >
                        {r.userEmail}
                      </a>
                    </td>
                    <td>{r.userFullName ?? "—"}</td>
                    <td className="text-right font-semibold">
                      {r.businessesDeleted}
                    </td>
                    <td className="text-right text-sm text-ink-700">
                      {r.documentsRetained}
                    </td>
                    <td className="max-w-xs truncate text-sm text-ink-700">
                      {r.reason ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2 text-sm">
          {currentPage > 1 && (
            <a
              href={`?q=${encodeURIComponent(search)}&page=${currentPage - 1}`}
              className="rounded-lg border-2 border-ink-300 px-3 py-1.5 font-semibold hover:bg-ink-100"
            >
              ← Προηγούμενη
            </a>
          )}
          <span className="px-3 py-1.5 text-ink-700">
            Σελίδα {currentPage} από {totalPages}
          </span>
          {currentPage < totalPages && (
            <a
              href={`?q=${encodeURIComponent(search)}&page=${currentPage + 1}`}
              className="rounded-lg border-2 border-ink-300 px-3 py-1.5 font-semibold hover:bg-ink-100"
            >
              Επόμενη →
            </a>
          )}
        </div>
      )}
    </>
  );
}
