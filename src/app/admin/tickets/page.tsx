import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["updatedAt", "createdAt", "priority", "status"] as const;

const STATUS_TONE: Record<
  string,
  "success" | "danger" | "warning" | "brand" | "muted"
> = {
  open: "brand",
  waiting_customer: "warning",
  waiting_support: "danger",
  resolved: "success",
  closed: "muted",
};

const PRIORITY_LABEL: Record<number, string> = {
  1: "URGENT",
  2: "HIGH",
  3: "NORMAL",
  4: "LOW",
  5: "LOWEST",
};

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireAdmin("super_admin", "support");
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) {
    if (typeof v === "string") sp.set(k, v);
  }

  const pag = parsePagination(sp, 40);
  const search = parseSearch(sp);
  const range = parseDateRange(sp);
  const sort = parseSort(sp, SORT_FIELDS, {
    field: "updatedAt",
    dir: "desc",
  });
  const status = sp.get("status") ?? "";
  const assigned = sp.get("assigned") ?? "";

  const where: Prisma.SupportTicketWhereInput = {
    ...(status ? { status: status as "open" } : {}),
    ...(assigned === "me" ? { assignedToId: ctx.userId } : {}),
    ...(assigned === "unassigned" ? { assignedToId: null } : {}),
    ...(whereDate("createdAt", range) as Prisma.SupportTicketWhereInput),
    ...(search
      ? {
          OR: [
            { subject: { contains: search } },
            { fromEmail: { contains: search } },
            { fromName: { contains: search } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.SupportTicketOrderByWithRelationInput[] = sort.field
    ? [{ [sort.field]: sort.dir }]
    : [{ priority: "asc" }, { updatedAt: "desc" }];

  const [rows, total, openCount, waitingCount, mine] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy,
      take: pag.take,
      skip: pag.skip,
      include: {
        business: { select: { legalName: true, vatNumber: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.count({
      where: { status: { in: ["open", "waiting_support"] } },
    }),
    prisma.supportTicket.count({ where: { status: "waiting_support" } }),
    prisma.supportTicket.count({
      where: {
        assignedToId: ctx.userId,
        status: { in: ["open", "waiting_customer", "waiting_support"] },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Support tickets"
        subtitle={`${openCount} ανοικτά · ${waitingCount} περιμένουν εμάς · ${mine} μου έχουν ανατεθεί`}
      />

      <AdminListToolbar
        action="/admin/tickets"
        search={search}
        from={sp.get("from") ?? ""}
        to={sp.get("to") ?? ""}
        hidden={{ status, assigned }}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Chip href="/admin/tickets" label="Όλα" active={!status && !assigned} />
        <Chip
          href="/admin/tickets?status=open"
          label="Open"
          active={status === "open"}
        />
        <Chip
          href="/admin/tickets?status=waiting_support"
          label="Χρειάζονται εμάς"
          active={status === "waiting_support"}
        />
        <Chip
          href="/admin/tickets?status=waiting_customer"
          label="Περιμένουν πελάτη"
          active={status === "waiting_customer"}
        />
        <Chip
          href="/admin/tickets?status=resolved"
          label="Resolved"
          active={status === "resolved"}
        />
        <Chip
          href="/admin/tickets?status=closed"
          label="Closed"
          active={status === "closed"}
        />
        <span className="mx-1 h-6 border-l border-ink-300" aria-hidden />
        <Chip
          href="/admin/tickets?assigned=me"
          label="Δικά μου"
          active={assigned === "me"}
        />
        <Chip
          href="/admin/tickets?assigned=unassigned"
          label="Χωρίς owner"
          active={assigned === "unassigned"}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-ink-100 text-xs uppercase tracking-wide">
              <tr>
                <SortableTh
                  field="updatedAt"
                  label="Ενημερώθηκε"
                  current={sort}
                  basePath="/admin/tickets"
                  params={sp}
                  className="px-4 py-2 text-left"
                />
                <th className="px-4 py-2 text-left text-ink-500">Θέμα</th>
                <th className="px-4 py-2 text-left text-ink-500">Από</th>
                <th className="px-4 py-2 text-left text-ink-500">Επιχείρηση</th>
                <SortableTh
                  field="priority"
                  label="Prio"
                  current={sort}
                  basePath="/admin/tickets"
                  params={sp}
                  className="px-4 py-2 text-left"
                />
                <SortableTh
                  field="status"
                  label="Κατάσταση"
                  current={sort}
                  basePath="/admin/tickets"
                  params={sp}
                  className="px-4 py-2 text-left"
                />
                <th className="px-4 py-2 text-right text-ink-500">Μηνύματα</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/60">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-ink-500">
                    Δεν βρέθηκαν tickets με τα τρέχοντα φίλτρα.
                  </td>
                </tr>
              )}
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-ink-100/40">
                  <td className="px-4 py-2 text-ink-500 whitespace-nowrap">
                    {t.updatedAt.toLocaleString("el-GR")}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/tickets/${t.id}`}
                      className="font-medium text-brand-800 hover:text-brand-900"
                    >
                      {t.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-ink-700">
                    <p>{t.fromName ?? "—"}</p>
                    <p className="text-xs text-ink-500">{t.fromEmail}</p>
                  </td>
                  <td className="px-4 py-2 text-ink-700 text-xs">
                    {t.business?.legalName ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <Badge
                      tone={
                        t.priority <= 2
                          ? "danger"
                          : t.priority === 3
                            ? "warning"
                            : "muted"
                      }
                    >
                      {PRIORITY_LABEL[t.priority] ?? t.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={STATUS_TONE[t.status] ?? "neutral"}>
                      {t.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {t._count.messages}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AdminPagination
        basePath="/admin/tickets"
        params={sp}
        page={pag.page}
        pageSize={pag.pageSize}
        total={total}
        pageSizes={[20, 50, 100]}
      />
    </>
  );
}

function Chip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <a
      href={href}
      className={
        "rounded-full border-2 px-3 py-1 text-xs font-bold " +
        (active
          ? "border-brand-800 bg-brand-700 text-white"
          : "border-ink-300 bg-white text-ink-700 hover:border-ink-500")
      }
    >
      {label}
    </a>
  );
}
