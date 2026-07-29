import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LinkButton, Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Trash2 } from "lucide-react";
import { money, date } from "@/lib/format";
import type { ExpensePaymentStatus } from "@prisma/client";
import { ExpenseForm } from "../ExpenseForm";
import { RecordExpensePaymentButton } from "../RecordExpensePaymentButton";
import {
  deleteExpenseAction,
  deleteExpensePaymentAction,
} from "../actions";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  cash: "Μετρητά",
  card: "Κάρτα",
  bank_transfer: "Τραπεζική",
  iris: "IRIS",
  check: "Επιταγή",
  credit: "Επί πιστώσει",
  other: "Άλλο",
};

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");

  const [expense, suppliers] = await Promise.all([
    prisma.expense.findFirst({
      where: { id, businessId: ctx.businessId },
      include: {
        supplier: { select: { id: true, legalName: true } },
        payments: { orderBy: { paidAt: "desc" } },
      },
    }),
    prisma.supplier.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { legalName: "asc" },
      select: { id: true, legalName: true },
    }),
  ]);

  if (!expense) notFound();

  const outstanding = Math.max(
    0,
    Number(expense.totalAmount) - Number(expense.paidAmount),
  );

  return (
    <>
      <PageHeader
        title={`Έξοδο · ${expense.reference ?? "—"}`}
        subtitle={
          expense.supplier
            ? `${expense.supplier.legalName} · ${date(expense.issueDate)}`
            : date(expense.issueDate)
        }
        actions={
          <>
            <LinkButton
              href="/app/expenses"
              variant="secondary"
              icon={ArrowLeft}
            >
              Πίσω
            </LinkButton>
            {outstanding > 0 && (
              <RecordExpensePaymentButton
                expenseId={expense.id}
                supplierId={expense.supplier?.id}
                outstanding={outstanding}
              />
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Στοιχεία εξόδου"
              action={<PaymentBadge status={expense.paymentStatus} />}
            />
            <CardBody>
              <ExpenseForm
                mode="edit"
                initial={{
                  id: expense.id,
                  supplierId: expense.supplierId,
                  category: expense.category,
                  myDataType: expense.myDataType,
                  reference: expense.reference,
                  description: expense.description,
                  netAmount: Number(expense.netAmount),
                  vatRate: Number(expense.vatRate),
                  issueDate: expense.issueDate,
                  notes: expense.notes,
                }}
                suppliers={suppliers}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Πληρωμές"
              subtitle={`${expense.payments.length} καταχωρήσεις`}
              action={
                <RecordExpensePaymentButton
                  expenseId={expense.id}
                  supplierId={expense.supplier?.id}
                  outstanding={outstanding}
                />
              }
            />
            <CardBody className="p-0">
              {expense.payments.length === 0 ? (
                <p className="p-6 text-sm text-ink-500">
                  Δεν έχει καταχωρηθεί καμία πληρωμή για αυτό το έξοδο.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ημ/νία</th>
                        <th>Μέθοδος</th>
                        <th>Αναφορά</th>
                        <th className="text-right">Ποσό</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {expense.payments.map((p) => (
                        <tr key={p.id}>
                          <td className="mono">{date(p.paidAt)}</td>
                          <td>
                            <Badge tone="neutral">
                              {METHOD_LABEL[p.method] ?? p.method}
                            </Badge>
                          </td>
                          <td className="text-ink-700">
                            {p.reference ?? "—"}
                          </td>
                          <td className="text-right font-semibold text-brand-900">
                            {money(p.amount)}
                          </td>
                          <td className="text-right">
                            <form action={deleteExpensePaymentAction}>
                              <input type="hidden" name="id" value={p.id} />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                icon={Trash2}
                              >
                                <span className="sr-only">Διαγραφή</span>
                              </Button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Σύνοψη" />
            <CardBody className="space-y-3 text-sm">
              <Row label="Καθαρή αξία" value={money(expense.netAmount)} />
              <Row
                label={`ΦΠΑ ${Number(expense.vatRate)}%`}
                value={money(expense.vatAmount)}
              />
              <div className="my-2 border-t-2 border-ink-200" />
              <Row
                label="Σύνολο"
                value={money(expense.totalAmount)}
                strong
              />
              <Row
                label="Πληρώθηκε"
                value={money(expense.paidAmount)}
              />
              <Row
                label="Υπόλοιπο"
                value={money(outstanding)}
                strong
                tone={outstanding > 0 ? "danger" : "success"}
              />
            </CardBody>
          </Card>

          {expense.supplier && (
            <Card>
              <CardHeader title="Προμηθευτής" />
              <CardBody>
                <Link
                  href={`/app/expenses/suppliers/${expense.supplier.id}`}
                  className="text-lg font-bold text-brand-800 hover:text-brand-900"
                >
                  {expense.supplier.legalName}
                </Link>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Επικίνδυνη ζώνη" />
            <CardBody>
              <form action={deleteExpenseAction}>
                <input type="hidden" name="id" value={expense.id} />
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                >
                  Διαγραφή εξόδου
                </Button>
                <p className="mt-2 text-xs text-ink-500">
                  Οι πληρωμές του εξόδου παραμένουν στο ιστορικό ως αποσυνδεδεμένες.
                </p>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "success" | "danger";
}) {
  const color =
    tone === "danger"
      ? "text-red-700"
      : tone === "success"
        ? "text-emerald-800"
        : "text-brand-900";
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-700">{label}</span>
      <span className={`${strong ? "text-lg font-extrabold " : "font-semibold "}${color}`}>
        {value}
      </span>
    </div>
  );
}

function PaymentBadge({ status }: { status: ExpensePaymentStatus }) {
  if (status === "paid") return <Badge tone="success">Εξοφλημένο</Badge>;
  if (status === "partial") return <Badge tone="warning">Μερικώς</Badge>;
  return <Badge tone="danger">Ανεξόφλητο</Badge>;
}
