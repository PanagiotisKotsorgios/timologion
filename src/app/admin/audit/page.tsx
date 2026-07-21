import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LinkButton } from "@/components/ui/Button";
import { date } from "@/lib/format";

const PAGE_SIZE = 50;

type SearchParams = { q?: string; page?: string };

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin("super_admin", "support", "analyst");
  const { q, page } = await searchParams;
  const search = q?.trim() ?? "";
  const currentPage = Math.max(1, Number(page ?? "1") || 1);

  const where = search
    ? {
        OR: [
          { action: { contains: search } },
          { entityType: { contains: search } },
          { entityId: { contains: search } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (currentPage - 1) * PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Batch-fetch related users and businesses to avoid N+1.
  const userIds = Array.from(new Set(rows.map((r) => r.userId).filter(Boolean))) as string[];
  const businessIds = Array.from(new Set(rows.map((r) => r.businessId).filter(Boolean))) as string[];
  const [users, businesses] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, fullName: true },
        })
      : [],
    businessIds.length
      ? prisma.business.findMany({
          where: { id: { in: businessIds } },
          select: { id: true, legalName: true, tradeName: true },
        })
      : [],
  ]);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const bizMap = new Map(businesses.map((b) => [b.id, b]));

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle={`${total} events. Πλήρες ιστορικό ενεργειών σε επίπεδο πλατφόρμας.`}
      />

      <form className="mb-4 max-w-md">
        <Input
          name="q"
          defaultValue={search}
          placeholder="Αναζήτηση σε action, entity, id..."
        />
      </form>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-2 text-left">Ώρα</th>
              <th className="px-4 py-2 text-left">Action</th>
              <th className="px-4 py-2 text-left">Χρήστης</th>
              <th className="px-4 py-2 text-left">Επιχείρηση</th>
              <th className="px-4 py-2 text-left">Entity</th>
              <th className="px-4 py-2 text-left">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-300/60">
            {rows.map((r) => {
              const u = r.userId ? userMap.get(r.userId) : null;
              const b = r.businessId ? bizMap.get(r.businessId) : null;
              return (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-ink-500 whitespace-nowrap">
                    {date(r.createdAt)}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-brand-700">
                    {r.action}
                  </td>
                  <td className="px-4 py-2">
                    {u ? (
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-brand-700 hover:text-brand-800"
                      >
                        {u.fullName || u.email}
                      </Link>
                    ) : (
                      <span className="text-ink-500">system</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {b ? (
                      <Link
                        href={`/admin/businesses/${b.id}`}
                        className="text-brand-700 hover:text-brand-800"
                      >
                        {b.tradeName ?? b.legalName}
                      </Link>
                    ) : (
                      <span className="text-ink-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-ink-700 text-xs">
                    {r.entityType ? (
                      <>
                        {r.entityType}
                        {r.entityId && (
                          <span className="ml-1 font-mono text-ink-500">
                            {r.entityId.slice(0, 8)}
                          </span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-ink-500">
                    {r.ipAddress ?? "—"}
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
                href={`/admin/audit?${new URLSearchParams({ q: search, page: String(currentPage - 1) })}`}
                variant="secondary"
                size="sm"
              >
                Προηγούμενη
              </LinkButton>
            )}
            {currentPage < totalPages && (
              <LinkButton
                href={`/admin/audit?${new URLSearchParams({ q: search, page: String(currentPage + 1) })}`}
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
