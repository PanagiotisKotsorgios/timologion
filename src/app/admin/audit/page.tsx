import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { AdminExportButton } from "@/components/admin/AdminExportButton";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { SortableTh } from "@/components/admin/SortableTh";
import {
  parsePagination,
  parseSearch,
  parseSort,
  parseDateRange,
  whereDate,
} from "@/lib/admin-list";
import { date } from "@/lib/format";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["createdAt", "action"] as const;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin("super_admin", "support", "analyst");
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) {
    if (typeof v === "string") sp.set(k, v);
  }

  const pag = parsePagination(sp, 50);
  const search = parseSearch(sp);
  const range = parseDateRange(sp);
  const sort = parseSort(sp, SORT_FIELDS, { field: "createdAt", dir: "desc" });

  const where: Prisma.AuditLogWhereInput = {
    ...(whereDate("createdAt", range) as Prisma.AuditLogWhereInput),
    ...(search
      ? {
          OR: [
            { action: { contains: search } },
            { entityType: { contains: search } },
            { entityId: { contains: search } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.AuditLogOrderByWithRelationInput = sort.field
    ? { [sort.field]: sort.dir }
    : { createdAt: "desc" };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy,
      take: pag.take,
      skip: pag.skip,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const userIds = Array.from(
    new Set(rows.map((r) => r.userId).filter(Boolean)),
  ) as string[];
  const businessIds = Array.from(
    new Set(rows.map((r) => r.businessId).filter(Boolean)),
  ) as string[];
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
        subtitle={`${total.toLocaleString("el-GR")} events. Πλήρες ιστορικό ενεργειών σε επίπεδο πλατφόρμας.`}
        actions={<AdminExportButton entity="audit" params={{ q: search }} />}
      />

      <AdminListToolbar
        action="/admin/audit"
        search={search}
        from={sp.get("from") ?? ""}
        to={sp.get("to") ?? ""}
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-100 text-xs uppercase tracking-wide">
              <tr>
                <SortableTh
                  field="createdAt"
                  label="Ώρα"
                  current={sort}
                  basePath="/admin/audit"
                  params={sp}
                  className="px-4 py-2 text-left"
                />
                <SortableTh
                  field="action"
                  label="Action"
                  current={sort}
                  basePath="/admin/audit"
                  params={sp}
                  className="px-4 py-2 text-left"
                />
                <th className="px-4 py-2 text-left text-ink-500">Χρήστης</th>
                <th className="px-4 py-2 text-left text-ink-500">Επιχείρηση</th>
                <th className="px-4 py-2 text-left text-ink-500">Entity</th>
                <th className="px-4 py-2 text-left text-ink-500">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/60">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-ink-500">
                    Δεν βρέθηκαν events.
                  </td>
                </tr>
              )}
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
        </div>
      </Card>

      <AdminPagination
        basePath="/admin/audit"
        params={sp}
        page={pag.page}
        pageSize={pag.pageSize}
        total={total}
        pageSizes={[25, 50, 100, 200]}
      />
    </>
  );
}
