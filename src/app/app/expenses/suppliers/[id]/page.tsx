import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LinkButton, Button } from "@/components/ui/Button";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { money, date } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import type { ExpensePaymentStatus } from "@prisma/client";
import { SupplierForm } from "../SupplierForm";
import { deleteSupplierAction } from "../../actions";
import { RecordExpensePaymentButton } from "../../RecordExpensePaymentButton";

export const dynamic = "force-dynamic";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:read");

  const supplier = await prisma.supplier.findFirst({
    where: { id, businessId: ctx.businessId },
    include: {
      expenses: {
        orderBy: { issueDate: "desc" },
        take: 20,
      },
      _count: { select: { expenses: true, payments: true } },
    },
  });
  if (!supplier) notFound();

  const totals = supplier.expenses.reduce(
    (acc, e) => {
      acc.total += Number(e.totalAmount);
      acc.paid += Number(e.paidAmount);
      return acc;
    },
    { total: 0, paid: 0 },
  );
  const outstanding = Math.max(0, totals.total - totals.paid);

  return (
    <>
      <PageHeader
        title={supplier.legalName}
        subtitle={supplier.tradeName ?? undefined}
        actions={
          <>
            <LinkButton
              href="/app/expenses/suppliers"
              variant="secondary"
              icon={ArrowLeft}
            >
              Πίσω
            </LinkButton>
            <RecordExpensePaymentButton
              supplierId={supplier.id}
              outstanding={outstanding}
            />
            <LinkButton
              href={`/app/expenses/new?supplier=${supplier.id}`}
              icon={Plus}
            >
              Νέο έξοδο
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Στοιχεία προμηθευτή" />
            <CardBody>
              <SupplierForm
                mode="edit"
                initial={{
                  id: supplier.id,
                  vatNumber: supplier.vatNumber,
                  legalName: supplier.legalName,
                  tradeName: supplier.tradeName,
                  taxOffice: supplier.taxOffice,
                  activity: supplier.activity,
                  addressLine: supplier.addressLine,
                  city: supplier.city,
                  postalCode: supplier.postalCode,
                  email: supplier.email,
                  phone: supplier.phone,
                  iban: supplier.iban,
                  notes: supplier.notes,
                }}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Πρόσφατα έξοδα"
              subtitle={`${supplier._count.expenses} συνολικά · ${supplier._count.payments} πληρωμές`}
            />
            <CardBody className="p-0">
              {supplier.expenses.length === 0 ? (
                <p className="p-6 text-sm text-ink-500">
                  Δεν υπάρχουν έξοδα ακόμη για αυτόν τον προμηθευτή.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ημ/νία</th>
                        <th>Παραστατικό</th>
                        <th>Κατηγορία</th>
                        <th className="text-right">Σύνολο</th>
                        <th>Πληρωμή</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplier.expenses.map((e) => (
                        <tr key={e.id}>
                          <td className="mono">
                            <Link
                              href={`/app/expenses/${e.id}`}
                              className="font-semibold text-brand-800 hover:text-brand-900"
                            >
                              {date(e.issueDate)}
                            </Link>
                          </td>
                          <td className="mono text-sm text-ink-700">
                            {e.reference ?? "—"}
                          </td>
                          <td className="text-sm text-ink-700">
                            {e.category ?? "—"}
                          </td>
                          <td className="text-right font-semibold">
                            {money(e.totalAmount)}
                          </td>
                          <td>
                            <PaymentBadge status={e.paymentStatus} />
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
              <Row label="Σύνολο εξόδων" value={money(totals.total)} />
              <Row label="Πληρώθηκαν" value={money(totals.paid)} />
              <div className="my-2 border-t-2 border-ink-200" />
              <Row
                label="Υπόλοιπο"
                value={money(outstanding)}
                strong
                tone={outstanding > 0 ? "danger" : "success"}
              />
              {supplier.iban && (
                <div className="mt-4 rounded-lg border-2 border-brand-100 bg-brand-50/50 p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-ink-500">
                    IBAN
                  </p>
                  <p className="mt-1 mono text-sm text-brand-900">
                    {supplier.iban}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Επικίνδυνη ζώνη" />
            <CardBody>
              <form action={deleteSupplierAction}>
                <input type="hidden" name="id" value={supplier.id} />
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                >
                  Διαγραφή προμηθευτή
                </Button>
                <p className="mt-2 text-xs text-ink-500">
                  Τα έξοδα παραμένουν στο ιστορικό, αλλά αποσυνδέονται από τον προμηθευτή.
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
      <span
        className={`${strong ? "text-lg font-extrabold " : "font-semibold "}${color}`}
      >
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
