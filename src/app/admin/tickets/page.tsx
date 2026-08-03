import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { LinkButton } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

type SearchParams = {
  q?: string;
  status?: string;
  assigned?: "me" | "unassigned";
  page?: string;
};

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
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requireAdmin("super_admin", "support");
  const { q, status, assigned, page } = await searchParams;
  const search = q?.trim() ?? "";
  const currentPage = Math.max(1, Number(page ?? "1") || 1);

  const where = {
    ...(status ? { status: status as "open" } : {}),
    ...(assigned === "me" ? { assignedToId: ctx.userId } : {}),
    ...(assigned === "unassigned" ? { assignedToId: null } : {}),
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

  const [rows, total, openCount, waitingCount, mine] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
      take: PAGE_SIZE,
      skip: (currentPage - 1) * PAGE_SIZE,
      include: {
        business: { select: { legalName: true, vatNumber: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.count({
      where: { status: { in: ["open", "waiting_support"] } },
    }),
    prisma.supportTicket.count({
      where: { status: "waiting_support" },
    }),
    prisma.supportTicket.count({
      where: {
        assignedToId: ctx.userId,
        status: { in: ["open", "waiting_customer", "waiting_support"] },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Support tickets"
        subtitle={`${openCount} ανοικτά · ${waitingCount} περιμένουν εμάς · ${mine} μου έχουν ανατεθεί`}
      />

      <form className="mb-4 grid gap-3 md:grid-cols-3">
        <Input
          name="q"
          defaultValue={search}
          placeholder="Αναζήτηση σε θέμα ή email..."
        />
        {status && <input type="hidden" name="status" value={status} />}
        {assigned && <input type="hidden" name="assigned" value={assigned} />}
      </form>

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
            <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-2 text-left">Ενημερώθηκε</th>
                <th className="px-4 py-2 text-left">Θέμα</th>
                <th className="px-4 py-2 text-left">Από</th>
                <th className="px-4 py-2 text-left">Επιχείρηση</th>
                <th className="px-4 py-2 text-left">Prio</th>
                <th className="px-4 py-2 text-left">Κατάσταση</th>
                <th className="px-4 py-2 text-right">Μηνύματα</th>
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

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-500">
            Σελίδα {currentPage} / {totalPages}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <LinkButton
                href={`/admin/tickets?${new URLSearchParams({
                  q: search,
                  ...(status ? { status } : {}),
                  ...(assigned ? { assigned } : {}),
                  page: String(currentPage - 1),
                })}`}
                variant="secondary"
                size="sm"
              >
                Προηγούμενη
              </LinkButton>
            )}
            {currentPage < totalPages && (
              <LinkButton
                href={`/admin/tickets?${new URLSearchParams({
                  q: search,
                  ...(status ? { status } : {}),
                  ...(assigned ? { assigned } : {}),
                  page: String(currentPage + 1),
                })}`}
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
          : "border-ink-300 bg-white text-ink-800 hover:border-ink-500")
      }
    >
      {label}
    </a>
  );
}
