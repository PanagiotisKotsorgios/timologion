import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { date } from "@/lib/format";

type SearchParams = { q?: string; page?: string };

const PAGE_SIZE = 30;

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
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
          { email: { contains: search } },
          { fullName: { contains: search } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (currentPage - 1) * PAGE_SIZE,
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Χρήστες"
        subtitle={`${total} χρήστες συνολικά στην πλατφόρμα`}
      />

      <form className="mb-4 max-w-md">
        <Input
          name="q"
          defaultValue={search}
          placeholder="Αναζήτηση σε email ή όνομα..."
        />
      </form>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-2 text-left">Όνομα</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Platform</th>
              <th className="px-4 py-2 text-right">Επιχειρήσεις</th>
              <th className="px-4 py-2 text-right">Sessions</th>
              <th className="px-4 py-2 text-left">MFA</th>
              <th className="px-4 py-2 text-left">Ημ/νία</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-300/60">
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
                <td className="px-4 py-2 text-ink-700">{u.email}</td>
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
      </Card>

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-500">
            Σελίδα {currentPage} / {totalPages}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <LinkButton
                href={`/admin/users?${new URLSearchParams({ q: search, page: String(currentPage - 1) })}`}
                variant="secondary"
                size="sm"
              >
                Προηγούμενη
              </LinkButton>
            )}
            {currentPage < totalPages && (
              <LinkButton
                href={`/admin/users?${new URLSearchParams({ q: search, page: String(currentPage + 1) })}`}
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
