import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Receipt, Plus, Search, Users, Wallet } from "lucide-react";
import { LinkButton, Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Field } from "@/components/ui/Input";
import { date, money } from "@/lib/format";
import type { ExpensePaymentStatus, Prisma } from "@prisma/client";
import { ClickableRow } from "../ClickableRow";
import { Pagination, resolvePageSize } from "@/components/ui/Pagination";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { ImportExpensesButton } from "./ImportExpensesButton";
import {
  expenseMyDataCode,
  EXPENSE_MYDATA_TYPES,
} from "@/lib/expense-mydata-types";

type SearchParams = {
  q?: string;
  supplier?: string;
  status?: ExpensePaymentStatus;
  mydata?: string;
  from?: string;
  to?: string;
  page?: string;
  size?: string;
};

export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");

  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const supplierFilter = params.supplier?.trim() ?? "";
  const status = params.status;
  const myDataFilter = params.mydata?.trim() ?? "";
  const from = params.from ?? "";
  const to = params.to ?? "";
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const pageSize = resolvePageSize(params.size);

  const issueDate: Prisma.DateTimeFilter | undefined =
    from || to
      ? {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
        }
      : undefined;

  const where: Prisma.ExpenseWhereInput = {
    businessId: ctx.businessId,
    ...(supplierFilter ? { supplierId: supplierFilter } : {}),
    ...(status ? { paymentStatus: status } : {}),
    ...(myDataFilter ? { myDataType: myDataFilter } : {}),
    ...(issueDate ? { issueDate } : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search } },
            { category: { contains: search } },
            { description: { contains: search } },
            { supplier: { legalName: { contains: search } } },
          ],
        }
      : {}),
  };

  const firstOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  );

  const [rows, total, monthAgg, unpaidAgg, suppliers] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { issueDate: "desc" },
      take: pageSize,
      skip: (currentPage - 1) * pageSize,
      include: { supplier: { select: { legalName: true } } },
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({
      where: {
        businessId: ctx.businessId,
        issueDate: { gte: firstOfMonth },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: {
        businessId: ctx.businessId,
        paymentStatus: { in: ["unpaid", "partial"] },
      },
      _sum: { totalAmount: true, paidAmount: true },
      _count: true,
    }),
    prisma.supplier.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { legalName: "asc" },
      select: { id: true, legalName: true },
      take: 500,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const outstanding =
    Number(unpaidAgg._sum.totalAmount ?? 0) -
    Number(unpaidAgg._sum.paidAmount ?? 0);

  const baseQuery = {
    q: search,
    supplier: supplierFilter,
    status: status ?? "",
    from,
    to,
  };

  return (
    <>
      <PageHeader
        title="Έξοδα"
        subtitle="Καταγραφή εξόδων, προμηθευτές και πληρωμές — πλήρη εικόνα κόστους."
        actions={
          <>
            <a
              href="/app/expenses/suppliers"
              className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-teal-700 bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-700 sm:h-11 sm:text-base"
            >
              <Users size={16} strokeWidth={2.5} aria-hidden />
              Προμηθευτές
            </a>
            <ImportExpensesButton />
            <ExportMenu baseUrl="/api/export/expenses" />
            <LinkButton href="/app/expenses/new" icon={Plus}>
              Νέο έξοδο
            </LinkButton>
          </>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-500">
              Έξοδα τρέχοντος μήνα
            </p>
            <p className="mt-2 text-3xl font-extrabold text-brand-900">
              {money(monthAgg._sum.totalAmount ?? 0)}
            </p>
            <p className="mt-1 text-sm text-ink-700">
              {monthAgg._count} καταχωρήσεις
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-500">
              Ανεξόφλητα προς προμηθευτές
            </p>
            <p className="mt-2 text-3xl font-extrabold text-brand-900">
              {money(outstanding)}
            </p>
            <p className="mt-1 text-sm text-ink-700">
              {unpaidAgg._count} έξοδα ανοιχτά
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-500">
              Σύνολο εξόδων
            </p>
            <p className="mt-2 text-3xl font-extrabold text-brand-900">
              {total.toLocaleString("el-GR")}
            </p>
            <p className="mt-1 text-sm text-ink-700">
              καταχωρήσεις σε όλη τη χρήση
            </p>
          </CardBody>
        </Card>
      </div>

      <FilterBar
        search={search}
        supplier={supplierFilter}
        status={status}
        myDataFilter={myDataFilter}
        from={from}
        to={to}
        suppliers={suppliers}
      />

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Δεν βρέθηκαν έξοδα."
              description={
                search || supplierFilter || status || from || to
                  ? "Δοκίμασε να καθαρίσεις τα φίλτρα."
                  : "Πρόσθεσε το πρώτο έξοδο για να ξεκινήσεις."
              }
              action={
                <LinkButton href="/app/expenses/new" icon={Plus}>
                  Νέο έξοδο
                </LinkButton>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ημ/νία</th>
                  <th>Προμηθευτής</th>
                  <th>Κατηγορία</th>
                  <th>myDATA</th>
                  <th>Παραστατικό</th>
                  <th className="text-right">Καθαρό</th>
                  <th className="text-right">ΦΠΑ</th>
                  <th className="text-right">Σύνολο</th>
                  <th>Πληρωμή</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <ClickableRow key={e.id}>
                    <td className="mono">
                      <Link
                        href={`/app/expenses/${e.id}`}
                        data-row-anchor
                        className="font-semibold text-brand-800 hover:text-brand-900"
                      >
                        {date(e.issueDate)}
                      </Link>
                    </td>
                    <td>{e.supplier?.legalName ?? "—"}</td>
                    <td className="text-sm text-ink-700">
                      {e.category ?? "—"}
                    </td>
                    <td className="mono text-sm">
                      {expenseMyDataCode(e.myDataType) ?? (
                        <span className="text-ink-500">—</span>
                      )}
                    </td>
                    <td className="mono text-sm text-ink-700">
                      {e.reference ?? "—"}
                    </td>
                    <td className="text-right">{money(e.netAmount)}</td>
                    <td className="text-right text-sm text-ink-700">
                      {money(e.vatAmount)}
                    </td>
                    <td className="text-right font-semibold">
                      {money(e.totalAmount)}
                    </td>
                    <td>
                      <PaymentBadge status={e.paymentStatus} />
                    </td>
                  </ClickableRow>
                ))}
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
          "/app/expenses?" +
          new URLSearchParams({
            ...baseQuery,
            size: String(pageSize),
            page: String(p),
          }).toString()
        }
        sizeHref={(s) =>
          "/app/expenses?" +
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

function PaymentBadge({ status }: { status: ExpensePaymentStatus }) {
  if (status === "paid") return <Badge tone="success">Εξοφλημένο</Badge>;
  if (status === "partial") return <Badge tone="warning">Μερικώς</Badge>;
  return <Badge tone="danger">Ανεξόφλητο</Badge>;
}

function FilterBar({
  search,
  supplier,
  status,
  myDataFilter,
  from,
  to,
  suppliers,
}: {
  search: string;
  supplier: string;
  status?: ExpensePaymentStatus;
  myDataFilter: string;
  from: string;
  to: string;
  suppliers: { id: string; legalName: string }[];
}) {
  return (
    <form
      method="get"
      className="mb-5 grid gap-3 rounded-2xl border-2 border-ink-300 bg-white p-4 sm:grid-cols-2 lg:grid-cols-12"
    >
      <Field label="Αναζήτηση" htmlFor="q" className="lg:col-span-4">
        <Input
          id="q"
          name="q"
          defaultValue={search}
          placeholder="Προμηθευτής, κατηγορία, παραστατικό..."
        />
      </Field>
      <Field label="Προμηθευτής" htmlFor="supplier" className="lg:col-span-3">
        <Select id="supplier" name="supplier" defaultValue={supplier}>
          <option value="">Όλοι</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.legalName}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Πληρωμή" htmlFor="status" className="lg:col-span-2">
        <Select id="status" name="status" defaultValue={status ?? ""}>
          <option value="">Όλα</option>
          <option value="unpaid">Ανεξόφλητα</option>
          <option value="partial">Μερικώς</option>
          <option value="paid">Εξοφλημένα</option>
        </Select>
      </Field>
      <Field label="Τύπος myDATA" htmlFor="mydata" className="lg:col-span-3">
        <Select id="mydata" name="mydata" defaultValue={myDataFilter}>
          <option value="">Όλοι</option>
          {EXPENSE_MYDATA_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.code} — {t.label.split(" — ")[1] ?? t.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Από" htmlFor="from" className="lg:col-span-2">
        <Input id="from" name="from" type="date" defaultValue={from} />
      </Field>
      <Field label="Έως" htmlFor="to" className="lg:col-span-2">
        <Input id="to" name="to" type="date" defaultValue={to} />
      </Field>
      <div className="sm:col-span-2 lg:col-span-3 lg:self-end">
        <Field label=" " htmlFor="submit">
          <Button type="submit" size="md" className="w-full" icon={Search}>
            Εφαρμογή φίλτρων
          </Button>
        </Field>
      </div>
    </form>
  );
}
