import Link from "next/link";
import { FileText, Layers, Package, Send } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton, Button } from "@/components/ui/Button";
import { money, date } from "@/lib/format";
import { issuePlatformInvoiceAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function BillingOverviewPage() {
  await requireAdmin();

  const [subs, providerCostAgg, invoiceAgg, latestInvoices, subsByStatus] =
    await Promise.all([
      prisma.businessSubscription.findMany({
        where: { status: { in: ["active", "trialing"] } },
        include: {
          plan: true,
          business: {
            select: { id: true, legalName: true, tradeName: true, vatNumber: true },
          },
        },
      }),
      prisma.providerCost.aggregate({
        _sum: { totalAmount: true, netAmount: true },
      }),
      prisma.platformInvoice.aggregate({
        _sum: {
          totalAmount: true,
          providerCost: true,
          margin: true,
        },
        _count: true,
      }),
      prisma.platformInvoice.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
        include: {
          business: {
            select: { id: true, legalName: true, tradeName: true },
          },
        },
      }),
      prisma.businessSubscription.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

  // MRR = sum of monthly-normalized price of active subs.
  let mrr = 0;
  for (const s of subs) {
    const price =
      s.priceOverride != null
        ? Number(s.priceOverride)
        : s.billingCycle === "monthly"
          ? Number(s.plan.priceMonthly)
          : Number(s.plan.priceYearly) / 12;
    mrr += price;
  }
  const arr = mrr * 12;

  const platformRevenue = Number(invoiceAgg._sum.totalAmount ?? 0);
  const providerCostTotal = Number(invoiceAgg._sum.providerCost ?? 0);
  const marginTotal = Number(invoiceAgg._sum.margin ?? 0);
  const providerCostStandalone = Number(providerCostAgg._sum.totalAmount ?? 0);

  return (
    <>
      <PageHeader
        title="Χρέωση & έσοδα πλατφόρμας"
        subtitle="Συνδρομές πελατών, κόστη παρόχου και περιθώριο κέρδους."
        actions={
          <>
            <LinkButton
              href="/admin/plans"
              variant="secondary"
              icon={Package}
            >
              Πακέτα
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="MRR" value={money(mrr)} sub="Ενεργές συνδρομές / μήνα" />
        <Kpi label="ARR" value={money(arr)} sub="MRR × 12" />
        <Kpi
          label="Έσοδα πλατφόρμας (σύνολο)"
          value={money(platformRevenue)}
          sub={`${invoiceAgg._count} παραστατικά`}
        />
        <Kpi
          label="Καθαρό περιθώριο"
          value={money(marginTotal)}
          sub={`Κόστος παρόχου: ${money(providerCostTotal + providerCostStandalone)}`}
        />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader
            title="Κατάσταση συνδρομών"
            subtitle={`${subs.length} ενεργές`}
          />
          <CardBody className="space-y-2 text-sm">
            {subsByStatus.length === 0 ? (
              <p className="text-ink-700">Καμία συνδρομή ακόμη.</p>
            ) : (
              subsByStatus.map((s) => (
                <div key={s.status} className="flex justify-between">
                  <span className="text-ink-700">{statusLabel(s.status)}</span>
                  <span className="font-semibold text-ink-900">
                    {s._count._all}
                  </span>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader
            title="Ενεργές συνδρομές"
            action={
              <LinkButton
                href="/admin/businesses"
                variant="ghost"
                size="sm"
                icon={Layers}
              >
                Όλες οι επιχειρήσεις →
              </LinkButton>
            }
          />
          <CardBody className="p-0">
            {subs.length === 0 ? (
              <p className="p-6 text-sm text-ink-700">
                Δεν υπάρχουν ενεργές συνδρομές. Ανάθεσε πακέτο σε επιχείρηση από
                την καρτέλα της.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Επιχείρηση</th>
                      <th>Πακέτο</th>
                      <th>Κύκλος</th>
                      <th className="text-right">Τιμή/μήνα</th>
                      <th>Επόμενη χρέωση</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subs.map((s) => {
                      const monthly =
                        s.priceOverride != null
                          ? Number(s.priceOverride)
                          : s.billingCycle === "monthly"
                            ? Number(s.plan.priceMonthly)
                            : Number(s.plan.priceYearly) / 12;
                      return (
                        <tr key={s.id}>
                          <td>
                            <Link
                              href={`/admin/businesses/${s.business.id}`}
                              className="font-semibold text-brand-800 hover:text-brand-900"
                            >
                              {s.business.tradeName ?? s.business.legalName}
                            </Link>
                            <div className="text-xs text-ink-500">
                              ΑΦΜ {s.business.vatNumber}
                            </div>
                          </td>
                          <td>{s.plan.name}</td>
                          <td>
                            <Badge tone="brand">
                              {s.billingCycle === "monthly"
                                ? "Μηνιαία"
                                : "Ετήσια"}
                            </Badge>
                          </td>
                          <td className="text-right font-semibold">
                            {money(monthly)}
                          </td>
                          <td>
                            {s.nextBillingAt
                              ? date(s.nextBillingAt)
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Πρόσφατα παραστατικά πλατφόρμας"
          subtitle="Τιμολόγηση των συνδρομών των πελατών μέσω Wrapp."
        />
        <CardBody className="p-0">
          {latestInvoices.length === 0 ? (
            <p className="p-6 text-sm text-ink-700">
              Δεν έχουν εκδοθεί παραστατικά ακόμη. Δημιούργησε ένα από την
              καρτέλα επιχείρησης.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ημ/νία</th>
                    <th>Επιχείρηση</th>
                    <th>Περιγραφή</th>
                    <th className="text-right">Σύνολο</th>
                    <th className="text-right">Κόστος</th>
                    <th className="text-right">Περιθώριο</th>
                    <th>Κατάσταση</th>
                    <th className="text-right" />
                  </tr>
                </thead>
                <tbody>
                  {latestInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="mono">{date(inv.issueDate)}</td>
                      <td>
                        <Link
                          href={`/admin/businesses/${inv.business.id}`}
                          className="font-semibold text-brand-800 hover:text-brand-900"
                        >
                          {inv.business.tradeName ?? inv.business.legalName}
                        </Link>
                      </td>
                      <td className="text-ink-700">{inv.description}</td>
                      <td className="text-right font-semibold">
                        {money(inv.totalAmount)}
                      </td>
                      <td className="text-right text-ink-700">
                        {money(inv.providerCost)}
                      </td>
                      <td className="text-right font-semibold text-emerald-800">
                        {money(inv.margin)}
                      </td>
                      <td>
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="text-right">
                        {inv.status === "draft" && (
                          <form action={issuePlatformInvoiceAction}>
                            <input type="hidden" name="id" value={inv.id} />
                            <Button
                              type="submit"
                              variant="secondary"
                              size="sm"
                              icon={Send}
                            >
                              Έκδοση
                            </Button>
                          </form>
                        )}
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

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-bold uppercase tracking-widest text-ink-500">
          {label}
        </p>
        <p className="mt-2 text-2xl font-bold text-brand-900 md:text-3xl">
          {value}
        </p>
        {sub && <p className="mt-2 text-sm text-ink-700">{sub}</p>}
      </CardBody>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "issued") return <Badge tone="success">Εκδόθηκε</Badge>;
  if (status === "sending") return <Badge tone="brand">Απεστάλη</Badge>;
  if (status === "failed") return <Badge tone="danger">Σφάλμα</Badge>;
  if (status === "cancelled") return <Badge tone="muted">Ακυρωμένο</Badge>;
  return <Badge>Πρόχειρο</Badge>;
}

function statusLabel(s: string) {
  switch (s) {
    case "active":
      return "Ενεργές";
    case "trialing":
      return "Δοκιμαστικές";
    case "past_due":
      return "Ληξιπρόθεσμες";
    case "cancelled":
      return "Ακυρωμένες";
    default:
      return s;
  }
}
