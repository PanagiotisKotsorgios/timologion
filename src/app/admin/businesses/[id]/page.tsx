import { notFound } from "next/navigation";
import Link from "next/link";
import { Ban, PowerOff, CheckCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { date, money } from "@/lib/format";
import { t } from "@/lib/i18n";
import {
  suspendBusinessAction,
  unsuspendBusinessAction,
} from "@/app/admin/actions";
import {
  AssignSubscriptionForm,
  RecordProviderCostForm,
  PlatformInvoiceForm,
} from "./SubscriptionCard";

export const dynamic = "force-dynamic";

export default async function AdminBusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [
    business,
    revenueAgg,
    docsByStatus,
    recentDocs,
    topClients,
    plans,
    subscription,
    providerCosts,
    platformInvoices,
  ] = await Promise.all([
      prisma.business.findUnique({
        where: { id },
        include: {
          wrappConnection: true,
          members: {
            include: {
              user: { select: { id: true, email: true, fullName: true } },
            },
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: {
              clients: true,
              items: true,
              documents: true,
              branches: true,
              billingBooks: true,
            },
          },
        },
      }),
      prisma.document.aggregate({
        where: { businessId: id, status: "issued" },
        _sum: { totalAmount: true },
      }),
      prisma.document.groupBy({
        by: ["status"],
        where: { businessId: id },
        _count: { _all: true },
      }),
      prisma.document.findMany({
        where: { businessId: id },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { client: { select: { legalName: true } } },
      }),
      prisma.client.findMany({
        where: { businessId: id },
        take: 5,
        orderBy: { legalName: "asc" },
        select: {
          id: true,
          legalName: true,
          _count: { select: { documents: true } },
        },
      }),
      prisma.platformPlan.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.businessSubscription.findFirst({
        where: {
          businessId: id,
          status: { in: ["active", "trialing", "past_due"] },
        },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.providerCost.findMany({
        where: { businessId: id },
        orderBy: { periodStart: "desc" },
        take: 6,
      }),
      prisma.platformInvoice.findMany({
        where: { businessId: id },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

  if (!business) notFound();

  const revenue = Number(revenueAgg._sum.totalAmount ?? 0);

  return (
    <>
      <PageHeader
        title={business.tradeName ?? business.legalName}
        subtitle={`ΑΦΜ ${business.vatNumber}${business.taxOffice ? " · " + business.taxOffice : ""}`}
        actions={
          business.suspendedAt ? (
            <form action={unsuspendBusinessAction}>
              <input type="hidden" name="businessId" value={business.id} />
              <Button
                type="submit"
                variant="secondary"
                icon={CheckCircle}
              >
                Άρση αναστολής
              </Button>
            </form>
          ) : (
            <form action={suspendBusinessAction} className="flex gap-2">
              <input type="hidden" name="businessId" value={business.id} />
              <Input
                name="reason"
                placeholder="Αιτιολογία (προαιρετικά)"
                className="w-64"
                maxLength={255}
              />
              <Button
                type="submit"
                variant="danger"
                icon={PowerOff}
              >
                Αναστολή
              </Button>
            </form>
          )
        }
      />

      {business.suspendedAt && (
        <div className="mb-6">
          <Alert
            tone="danger"
            title={`Η επιχείρηση είναι σε αναστολή από ${date(business.suspendedAt)}`}
          >
            {business.suspendedReason || "Χωρίς αιτιολογία"}
          </Alert>
        </div>
      )}

      {/* Billing block: subscription + provider cost + platform invoice */}
      <div className="mb-6 grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader
            title="Συνδρομή πλατφόρμας"
            subtitle={
              subscription
                ? `${subscription.plan.name} · ${subscription.billingCycle === "monthly" ? "Μηνιαία" : "Ετήσια"}`
                : "Δεν υπάρχει ενεργή συνδρομή."
            }
            action={
              subscription && (
                <Badge tone="success">
                  Έως {date(subscription.currentPeriodEnd)}
                </Badge>
              )
            }
          />
          <CardBody className="space-y-6">
            {plans.length === 0 ? (
              <Alert tone="info">
                Δεν έχεις ορίσει ακόμη πακέτα.{" "}
                <Link
                  href="/admin/plans/new"
                  className="font-semibold text-brand-800 hover:text-brand-900"
                >
                  Δημιούργησε το πρώτο πακέτο
                </Link>
                .
              </Alert>
            ) : (
              <AssignSubscriptionForm
                businessId={business.id}
                plans={plans.map((p) => ({
                  id: p.id,
                  code: p.code,
                  name: p.name,
                  priceMonthly: p.priceMonthly.toString(),
                  priceYearly: p.priceYearly.toString(),
                }))}
                currentPlanId={subscription?.planId ?? null}
                currentCycle={subscription?.billingCycle}
                currentOverride={
                  subscription?.priceOverride
                    ? subscription.priceOverride.toString()
                    : null
                }
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Κόστος παρόχου (Wrapp)"
            subtitle="Χρέωση για αυτόν τον πελάτη."
          />
          <CardBody className="space-y-4">
            <RecordProviderCostForm businessId={business.id} />
            <div className="space-y-2 border-t-2 border-ink-300/60 pt-4 text-sm">
              <p className="font-semibold text-ink-900">Πρόσφατα κόστη</p>
              {providerCosts.length === 0 ? (
                <p className="text-ink-700">Δεν υπάρχουν καταχωρήσεις.</p>
              ) : (
                <ul className="space-y-1.5">
                  {providerCosts.map((c) => (
                    <li key={c.id} className="flex justify-between">
                      <span className="text-ink-700">
                        {date(c.periodStart)} → {date(c.periodEnd)}
                      </span>
                      <span className="font-semibold text-ink-900">
                        {money(c.totalAmount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader
          title="Έκδοση παραστατικού πλατφόρμας"
          subtitle="Δημιουργεί πρόχειρο τιμολόγιο προς αυτόν τον πελάτη μέσω Wrapp."
        />
        <CardBody>
          <PlatformInvoiceForm
            businessId={business.id}
            subscriptionId={subscription?.id ?? null}
          />
        </CardBody>
      </Card>

      {platformInvoices.length > 0 && (
        <Card className="mb-6 overflow-hidden">
          <CardHeader
            title="Παραστατικά πλατφόρμας"
            subtitle="Τιμολόγηση συνδρομών & κέρδος ανά έκδοση."
          />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ημ/νία</th>
                    <th>Περιγραφή</th>
                    <th className="text-right">Σύνολο</th>
                    <th className="text-right">Κόστος</th>
                    <th className="text-right">Περιθώριο</th>
                    <th>Κατάσταση</th>
                  </tr>
                </thead>
                <tbody>
                  {platformInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="mono">{date(inv.issueDate)}</td>
                      <td>{inv.description}</td>
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
                        <Badge
                          tone={
                            inv.status === "issued"
                              ? "success"
                              : inv.status === "failed"
                                ? "danger"
                                : "neutral"
                          }
                        >
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Στοιχεία επιχείρησης" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Detail label="Νόμιμη επωνυμία" value={business.legalName} />
              <Detail
                label="Διακριτικός τίτλος"
                value={business.tradeName}
              />
              <Detail label="ΑΦΜ" value={business.vatNumber} />
              <Detail label="ΔΟΥ" value={business.taxOffice} />
              <Detail label="Δραστηριότητα" value={business.activity} />
              <Detail label="Email" value={business.email} />
              <Detail label="Τηλέφωνο" value={business.phone} />
              <Detail
                label="Διεύθυνση"
                value={[
                  business.addressLine,
                  business.postalCode,
                  business.city,
                ]
                  .filter(Boolean)
                  .join(", ")}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={`Μέλη (${business.members.length})`} />
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Όνομα</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Ρόλος</th>
                    <th className="px-4 py-2 text-left">Ημ/νία</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-300/60">
                  {business.members.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-2 font-medium text-ink-900">
                        <Link
                          href={`/admin/users/${m.user.id}`}
                          className="hover:text-brand-700"
                        >
                          {m.user.fullName || "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-ink-700">{m.user.email}</td>
                      <td className="px-4 py-2">
                        <Badge tone={m.role === "owner" ? "brand" : "neutral"}>
                          {m.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-ink-500">
                        {date(m.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Πρόσφατα παραστατικά" />
            <CardBody className="p-0">
              {recentDocs.length === 0 ? (
                <p className="p-6 text-sm text-ink-500">
                  Δεν έχουν εκδοθεί παραστατικά.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Ημ/νία</th>
                      <th className="px-4 py-2 text-left">Τύπος</th>
                      <th className="px-4 py-2 text-left">Πελάτης</th>
                      <th className="px-4 py-2 text-right">Σύνολο</th>
                      <th className="px-4 py-2 text-left">Κατάσταση</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-300/60">
                    {recentDocs.map((d) => (
                      <tr key={d.id}>
                        <td className="px-4 py-2 text-ink-500">
                          {date(d.issueDate)}
                        </td>
                        <td className="px-4 py-2">
                          {t.documents.types[d.type]}
                        </td>
                        <td className="px-4 py-2 text-ink-700">
                          {d.client?.legalName ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {money(d.totalAmount)}
                        </td>
                        <td className="px-4 py-2">
                          <Badge
                            tone={
                              d.status === "issued"
                                ? "success"
                                : d.status === "failed"
                                  ? "danger"
                                  : "neutral"
                            }
                          >
                            {t.status[
                              d.status as keyof typeof t.status
                            ] ?? d.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Οικονομικά" />
            <CardBody className="space-y-3">
              <div>
                <p className="text-xs text-ink-500">Συνολικά έσοδα εντός</p>
                <p className="text-2xl font-semibold text-brand-900">
                  {money(revenue)}
                </p>
              </div>
              <div className="space-y-1 text-sm">
                {docsByStatus.map((s) => (
                  <div key={s.status} className="flex items-center justify-between">
                    <span className="text-ink-500">
                      {t.status[s.status as keyof typeof t.status] ?? s.status}
                    </span>
                    <span className="font-medium">{s._count._all}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Πάροχος έκδοσης" />
            <CardBody className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Κατάσταση</span>
                <WrappBadge status={business.wrappConnection?.status} />
              </div>
              <Detail
                label="Wrapp user ID"
                value={business.wrappConnection?.wrappUserId ?? "—"}
              />
              <Detail
                label="Ενεργό πρόγραμμα"
                value={business.wrappConnection?.hasPlan ? "Ναι" : "Όχι"}
              />
              <Detail
                label="Άδεια έκδοσης"
                value={
                  business.wrappConnection?.canIssueInvoice ? "Ναι" : "Όχι"
                }
              />
              <Detail
                label="Τελ. verify"
                value={
                  business.wrappConnection?.lastVerifiedAt
                    ? date(business.wrappConnection.lastVerifiedAt)
                    : "—"
                }
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Σύνολα" />
            <CardBody className="space-y-2 text-sm">
              <Row label="Πελάτες" value={business._count.clients} />
              <Row label="Είδη/Υπηρεσίες" value={business._count.items} />
              <Row label="Υποκαταστήματα" value={business._count.branches} />
              <Row
                label="Σειρές παραστατικών"
                value={business._count.billingBooks}
              />
            </CardBody>
          </Card>

          {topClients.length > 0 && (
            <Card>
              <CardHeader title="Δείγμα πελατών" />
              <CardBody className="p-0">
                <ul className="divide-y divide-ink-300/60 text-sm">
                  {topClients.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between px-4 py-2"
                    >
                      <span className="truncate">{c.legalName}</span>
                      <span className="text-xs text-ink-500">
                        {c._count.documents} παραστ.
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm text-ink-900">
        {value && value.length > 0 ? value : "—"}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-300/60 pb-2 last:border-b-0 last:pb-0">
      <span className="text-ink-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function WrappBadge({ status }: { status?: string }) {
  if (!status || status === "inactive")
    return <Badge tone="muted">Ανενεργός</Badge>;
  if (status === "active") return <Badge tone="success">Ενεργός</Badge>;
  if (status === "pending") return <Badge tone="warning">Σε αναμονή</Badge>;
  return <Badge tone="danger">Σφάλμα</Badge>;
}
