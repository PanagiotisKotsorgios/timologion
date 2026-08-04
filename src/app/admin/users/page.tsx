import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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

const SORT_FIELDS = ["createdAt", "email", "fullName"] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) {
    if (typeof v === "string") sp.set(k, v);
  }

  const pag = parsePagination(sp);
  const search = parseSearch(sp);
  const range = parseDateRange(sp);
  const sort = parseSort(sp, SORT_FIELDS, { field: "createdAt", dir: "desc" });

  const where: Prisma.UserWhereInput = {
    ...(whereDate("createdAt", range) as Prisma.UserWhereInput),
    ...(search
      ? {
          OR: [
            { email: { contains: search } },
            { fullName: { contains: search } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.UserOrderByWithRelationInput = sort.field
    ? { [sort.field]: sort.dir }
    : { createdAt: "desc" };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      take: pag.take,
      skip: pag.skip,
      select: {
        id: true,
        email: true,
        fullName: true,
        platformRole: true,
        mfaEnabled: true,
        createdAt: true,
        _count: { select: { memberships: true, sessions: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title="Χρήστες"
        subtitle={`${total.toLocaleString("el-GR")} χρήστες συνολικά στην πλατφόρμα`}
        actions={<AdminExportButton entity="users" params={{ q: search }} />}
      />

      <AdminListToolbar
        action="/admin/users"
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
                  field="fullName"
                  label="Όνομα"
                  current={sort}
                  basePath="/admin/users"
                  params={sp}
                  className="px-4 py-2 text-left"
                />
                <SortableTh
                  field="email"
                  label="Email"
                  current={sort}
                  basePath="/admin/users"
                  params={sp}
                  className="px-4 py-2 text-left"
                />
                <th className="px-4 py-2 text-left text-ink-500">Platform</th>
                <th className="px-4 py-2 text-right text-ink-500">Επιχειρήσεις</th>
                <th className="px-4 py-2 text-right text-ink-500">Sessions</th>
                <th className="px-4 py-2 text-left text-ink-500">MFA</th>
                <SortableTh
                  field="createdAt"
                  label="Ημ/νία"
                  current={sort}
                  basePath="/admin/users"
                  params={sp}
                  className="px-4 py-2 text-left"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/60">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-ink-500">
                    Δεν βρέθηκαν χρήστες με τα τρέχοντα φίλτρα.
                  </td>
                </tr>
              )}
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-ink-100/60">
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="font-medium text-brand-700 hover:text-brand-800"
                    >
                      {u.fullName || "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-ink-700">
                    <Link href={`/admin/users/${u.id}`} className="block">
                      {u.email}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    {u.platformRole ? (
                      <Badge tone="warning">{u.platformRole}</Badge>
                    ) : (
                      <span className="text-xs text-ink-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {u._count.memberships}
                  </td>
                  <td className="px-4 py-2 text-right">{u._count.sessions}</td>
                  <td className="px-4 py-2">
                    {u.mfaEnabled ? (
                      <Badge tone="success">On</Badge>
                    ) : (
                      <Badge tone="muted">Off</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-ink-500">{date(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AdminPagination
        basePath="/admin/users"
        params={sp}
        page={pag.page}
        pageSize={pag.pageSize}
        total={total}
        pageSizes={[20, 50, 100]}
      />
    </>
  );
}
