import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { LinkButton, Button } from "@/components/ui/Button";
import { UserPlus, Search, ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Field } from "@/components/ui/Input";
import { ClickableRow } from "../../ClickableRow";
import { Pagination, resolvePageSize } from "@/components/ui/Pagination";
import { money } from "@/lib/format";

type SearchParams = {
  q?: string;
  page?: string;
  size?: string;
};

export const dynamic = "force-dynamic";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:read");

  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const pageSize = resolvePageSize(params.size);

  const where = {
    businessId: ctx.businessId,
    ...(search
      ? {
          OR: [
            { legalName: { contains: search } },
            { tradeName: { contains: search } },
            { vatNumber: { contains: search } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { legalName: "asc" },
      take: pageSize,
      skip: (currentPage - 1) * pageSize,
      include: {
        _count: { select: { expenses: true } },
        expenses: {
          where: { paymentStatus: { in: ["unpaid", "partial"] } },
          select: { totalAmount: true, paidAmount: true },
        },
      },
    }),
    prisma.supplier.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const baseQuery = { q: search };

  return (
    <>
      <PageHeader
        title="Προμηθευτές"
        subtitle={`${total} ${total === 1 ? "προμηθευτής" : "προμηθευτές"} συνολικά`}
        actions={
          <>
            <LinkButton
              href="/app/expenses"
              variant="secondary"
              icon={ArrowLeft}
            >
              Πίσω στα έξοδα
            </LinkButton>
            <LinkButton
              href="/app/expenses/suppliers/new"
              icon={UserPlus}
            >
              Νέος προμηθευτής
            </LinkButton>
          </>
        }
      />

      <form
        method="get"
        className="mb-5 grid gap-3 rounded-2xl border-2 border-ink-300 bg-white p-4 md:grid-cols-12"
      >
        <Field label="Αναζήτηση" htmlFor="q" className="md:col-span-9">
          <Input
            id="q"
            name="q"
            defaultValue={search}
            placeholder="Επωνυμία, τίτλος ή ΑΦΜ..."
          />
        </Field>
        <div className="md:col-span-3 md:self-end">
          <Field label=" " htmlFor="submit">
            <Button type="submit" size="md" className="w-full" icon={Search}>
              Εφαρμογή
            </Button>
          </Field>
        </div>
      </form>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={
                search
                  ? "Δεν βρέθηκαν προμηθευτές."
                  : "Δεν έχεις προμηθευτές ακόμα."
              }
              description={
                search
                  ? "Δοκίμασε άλλους όρους."
                  : "Πρόσθεσε τον πρώτο προμηθευτή για να ξεκινήσεις τη διαχείριση εξόδων."
              }
              action={
                <LinkButton
                  href="/app/expenses/suppliers/new"
                  icon={UserPlus}
                >
                  Νέος προμηθευτής
                </LinkButton>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Επωνυμία</th>
                  <th>ΑΦΜ</th>
                  <th>Πόλη</th>
                  <th className="text-right">Έξοδα</th>
                  <th className="text-right">Υπόλοιπο</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const balance = s.expenses.reduce(
                    (acc, e) =>
                      acc + (Number(e.totalAmount) - Number(e.paidAmount)),
                    0,
                  );
                  return (
                    <ClickableRow key={s.id}>
                      <td>
                        <Link
                          href={`/app/expenses/suppliers/${s.id}`}
                          data-row-anchor
                          className="font-semibold text-brand-800 hover:text-brand-900"
                        >
                          {s.legalName}
                        </Link>
                        {s.tradeName && (
                          <div className="text-xs text-ink-500">
                            {s.tradeName}
                          </div>
                        )}
                      </td>
                      <td className="mono">{s.vatNumber ?? "—"}</td>
                      <td>{s.city ?? "—"}</td>
                      <td className="text-right font-semibold">
                        {s._count.expenses}
                      </td>
                      <td
                        className={
                          "text-right font-semibold " +
                          (balance > 0 ? "text-red-700" : "text-ink-700")
                        }
                      >
                        {money(balance)}
                      </td>
                    </ClickableRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={total}
        pageSize={pageSize}
        buildHref={(p) =>
          "/app/expenses/suppliers?" +
          new URLSearchParams({
            ...baseQuery,
            size: String(pageSize),
            page: String(p),
          }).toString()
        }
        sizeHref={(s) =>
          "/app/expenses/suppliers?" +
          new URLSearchParams({
            ...baseQuery,
            size: String(s),
            page: "1",
          }).toString()
        }
      />
    </>
  );
}
