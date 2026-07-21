import Link from "next/link";
import { Wallet, Trash2, Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton, Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { money, date } from "@/lib/format";
import { PaymentForm } from "./PaymentForm";
import { deletePaymentAction } from "./actions";

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

export default async function PaymentsPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");

  const [payments, unpaidAgg, monthAgg] = await Promise.all([
    prisma.payment.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { receivedAt: "desc" },
      take: 100,
      include: {
        client: { select: { legalName: true } },
        document: { select: { id: true, series: true, number: true, type: true } },
      },
    }),
    prisma.document.aggregate({
      where: {
        businessId: ctx.businessId,
        status: "issued",
        paymentStatus: { in: ["unpaid", "partial"] },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: {
        businessId: ctx.businessId,
        receivedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Πληρωμές & Εισπράξεις"
        subtitle="Καταγραφή εισπράξεων και παρακολούθηση υπολοίπων."
        actions={
          <LinkButton
            href={`/api/export/payments?format=csv`}
            variant="secondary"
            icon={Download}
          >
            Εξαγωγή CSV
          </LinkButton>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-500">
              Εισπράξεις τρέχοντος μήνα
            </p>
            <p className="mt-2 text-3xl font-extrabold text-brand-900">
              {money(monthAgg._sum.amount ?? 0)}
            </p>
            <p className="mt-1 text-sm text-ink-700">
              {monthAgg._count} καταχωρήσεις
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-500">
              Ανεξόφλητα (σύνολο)
            </p>
            <p className="mt-2 text-3xl font-extrabold text-brand-900">
              {money(unpaidAgg._sum.totalAmount ?? 0)}
            </p>
            <p className="mt-1 text-sm text-ink-700">
              {unpaidAgg._count} παραστατικά ανοιχτά
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Νέα είσπραξη"
            subtitle="Χωρίς σύνδεση με παραστατικό."
          />
          <CardBody>
            <PaymentForm />
          </CardBody>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Ιστορικό εισπράξεων"
          subtitle={`${payments.length} πρόσφατες καταχωρήσεις`}
        />
        <CardBody className="p-0">
          {payments.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Δεν υπάρχουν εισπράξεις ακόμη."
                description="Καταγράψτε μια είσπραξη από ένα εκδοθέν παραστατικό."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ημ/νία</th>
                    <th>Πελάτης</th>
                    <th>Παραστατικό</th>
                    <th>Μέθοδος</th>
                    <th>Αναφορά</th>
                    <th className="text-right">Ποσό</th>
                    <th className="text-right" />
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="mono">{date(p.receivedAt)}</td>
                      <td>{p.client?.legalName ?? "—"}</td>
                      <td>
                        {p.document ? (
                          <Link
                            href={`/app/documents/${p.document.id}`}
                            className="font-semibold text-brand-800 hover:text-brand-900"
                          >
                            {p.document.series ?? ""}
                            {p.document.number ? ` #${p.document.number}` : ""}
                          </Link>
                        ) : (
                          <span className="text-ink-500">—</span>
                        )}
                      </td>
                      <td>
                        <Badge tone="neutral">
                          {METHOD_LABEL[p.method] ?? p.method}
                        </Badge>
                      </td>
                      <td className="text-ink-700">{p.reference ?? "—"}</td>
                      <td className="text-right font-semibold text-brand-900">
                        {money(p.amount)}
                      </td>
                      <td className="text-right">
                        <form action={deletePaymentAction}>
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
    </>
  );
}
