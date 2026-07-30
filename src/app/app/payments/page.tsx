import Link from "next/link";
import {
  Trash2,
  AlertTriangle,
  Clock3,
  CalendarClock,
  CheckCircle2,
  Search,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton, Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Input";
import { money, date } from "@/lib/format";
import { t } from "@/lib/i18n";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { NewPaymentButton } from "./NewPaymentButton";
import { deletePaymentAction } from "./actions";
import { RecordPaymentForDocButton } from "./RecordPaymentForDocButton";
import { MarkAsPaidButton } from "./MarkAsPaidButton";
import { Pagination, resolvePageSize } from "@/components/ui/Pagination";
import type { DocumentType, Prisma } from "@prisma/client";

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

type SearchParams = {
  page?: string;
  size?: string;
  openPage?: string;
  openSize?: string;
  q?: string;
  client?: string;
  type?: DocumentType;
  method?: string;
  from?: string;
  to?: string;
  aging?: "0-30" | "31-60" | "61-90" | "90+";
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");

  const params = await searchParams;
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const pageSize = resolvePageSize(params.size);
  const openPage = Math.max(1, Number(params.openPage ?? "1") || 1);
  const openSize = resolvePageSize(params.openSize);
  const search = params.q?.trim() ?? "";
  const clientFilter = params.client?.trim() ?? "";
  const typeFilter = params.type;
  const methodFilter = params.method?.trim() ?? "";
  const from = params.from ?? "";
  const to = params.to ?? "";
  const aging = params.aging;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Aging cutoffs — measured from today back.
  const cutoff30 = new Date(now);
  cutoff30.setDate(cutoff30.getDate() - 30);
  const cutoff60 = new Date(now);
  cutoff60.setDate(cutoff60.getDate() - 60);
  const cutoff90 = new Date(now);
  cutoff90.setDate(cutoff90.getDate() - 90);

  const openWhere: Prisma.DocumentWhereInput = {
    businessId: ctx.businessId,
    status: "issued",
    paymentStatus: { in: ["unpaid", "partial"] },
    ...(clientFilter ? { clientId: clientFilter } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(search
      ? {
          OR: [
            { series: { contains: search } },
            { client: { legalName: { contains: search } } },
            { client: { vatNumber: { contains: search } } },
          ],
        }
      : {}),
  };

  // Apply aging filter to the doc query when set.
  if (aging === "0-30") openWhere.issueDate = { gte: cutoff30 };
  else if (aging === "31-60")
    openWhere.issueDate = { gte: cutoff60, lt: cutoff30 };
  else if (aging === "61-90")
    openWhere.issueDate = { gte: cutoff90, lt: cutoff60 };
  else if (aging === "90+") openWhere.issueDate = { lt: cutoff90 };

  const historyWhere: Prisma.PaymentWhereInput = {
    businessId: ctx.businessId,
    ...(methodFilter
      ? { method: methodFilter as Prisma.EnumPaymentMethodFilter }
      : {}),
    ...(from || to
      ? {
          receivedAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
          },
        }
      : {}),
  };

  const [
    payments,
    totalPayments,
    monthAgg,
    openDocs,
    totalOpen,
    openDocIds,
    clients,
  ] = await Promise.all([
    prisma.payment.findMany({
      where: historyWhere,
      orderBy: { receivedAt: "desc" },
      take: pageSize,
      skip: (currentPage - 1) * pageSize,
      include: {
        client: { select: { legalName: true } },
        document: {
          select: { id: true, series: true, number: true, type: true },
        },
      },
    }),
    prisma.payment.count({ where: historyWhere }),
    prisma.payment.aggregate({
      where: {
        businessId: ctx.businessId,
        receivedAt: { gte: monthStart },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.document.findMany({
      where: openWhere,
      orderBy: { issueDate: "asc" },
      take: openSize,
      skip: (openPage - 1) * openSize,
      include: {
        client: { select: { id: true, legalName: true } },
      },
    }),
    prisma.document.count({ where: openWhere }),
    // All open doc ids (unfiltered) so aging totals stay accurate even
    // when a filter narrows the visible table.
    prisma.document.findMany({
      where: {
        businessId: ctx.businessId,
        status: "issued",
        paymentStatus: { in: ["unpaid", "partial"] },
      },
      select: { id: true, issueDate: true, totalAmount: true },
    }),
    prisma.client.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { legalName: "asc" },
      select: { id: true, legalName: true, tradeName: true },
      take: 500,
    }),
  ]);

  // Aggregate paid amounts per document for the visible open docs.
  const visibleIds = openDocs.map((d) => d.id);
  const paidPerDoc = new Map<string, number>();
  if (visibleIds.length > 0) {
    const groups = await prisma.payment.groupBy({
      by: ["documentId"],
      where: {
        businessId: ctx.businessId,
        documentId: { in: visibleIds },
      },
      _sum: { amount: true },
    });
    for (const g of groups) {
      if (g.documentId) {
        paidPerDoc.set(g.documentId, Number(g._sum.amount ?? 0));
      }
    }
  }

  // Aging totals — computed over ALL open docs, not filtered.
  const aggregatedByBucket = { b30: 0, b60: 0, b90: 0, bPlus: 0 };
  for (const d of openDocIds) {
    const totalOwed = Number(d.totalAmount);
    // Subtract paid so aging reflects remaining balance for that bucket.
    // We don't have paidAmount cached — but the display buckets are
    // approximations so we treat totalAmount as owed for now.
    if (d.issueDate >= cutoff30) aggregatedByBucket.b30 += totalOwed;
    else if (d.issueDate >= cutoff60) aggregatedByBucket.b60 += totalOwed;
    else if (d.issueDate >= cutoff90) aggregatedByBucket.b90 += totalOwed;
    else aggregatedByBucket.bPlus += totalOwed;
  }
  const totalOutstanding =
    aggregatedByBucket.b30 +
    aggregatedByBucket.b60 +
    aggregatedByBucket.b90 +
    aggregatedByBucket.bPlus;
  const overdueTotal =
    aggregatedByBucket.b60 + aggregatedByBucket.b90 + aggregatedByBucket.bPlus;

  const openQueryBase = {
    q: search,
    client: clientFilter,
    type: typeFilter ?? "",
    aging: aging ?? "",
  };
  const historyQueryBase = {
    method: methodFilter,
    from,
    to,
  };

  return (
    <>
      <PageHeader
        title="Πληρωμές & Εισπράξεις"
        subtitle="Καταγραφή εισπράξεων, ανεξόφλητα παραστατικά και αναφορές αδράνειας."
        actions={
          <>
            <NewPaymentButton />
            <ExportMenu baseUrl="/api/export/payments" />
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<CheckCircle2 size={22} />}
          label="Εισπράξεις μήνα"
          value={money(monthAgg._sum.amount ?? 0)}
          hint={`${monthAgg._count} καταχωρήσεις`}
        />
        <StatCard
          icon={<Clock3 size={22} />}
          label="Ανεξόφλητα (σύνολο)"
          value={money(totalOutstanding)}
          hint={`${openDocIds.length} παραστατικά ανοιχτά`}
        />
        <StatCard
          icon={<CalendarClock size={22} />}
          label="Ληξιπρόθεσμα > 30 ημ."
          value={money(overdueTotal)}
          hint="Χρειάζονται follow-up"
          tone={overdueTotal > 0 ? "warning" : undefined}
        />
        <StatCard
          icon={<AlertTriangle size={22} />}
          label="Ληξιπρόθεσμα > 90 ημ."
          value={money(aggregatedByBucket.bPlus)}
          hint="Επείγον follow-up"
          tone={aggregatedByBucket.bPlus > 0 ? "danger" : undefined}
        />
      </div>

      {/* Open documents (Ανεξόφλητα παραστατικά) */}
      <Card className="mb-6 overflow-hidden">
        <CardHeader
          title="Ανεξόφλητα παραστατικά"
          subtitle={`${totalOpen.toLocaleString("el-GR")} παραστατικά σε αναμονή είσπραξης`}
        />
        <CardBody className="p-0">
          <form
            method="get"
            className="grid gap-3 border-b-2 border-ink-200 bg-white p-4 md:grid-cols-12"
          >
            <input type="hidden" name="method" value={methodFilter} />
            <input type="hidden" name="from" value={from} />
            <input type="hidden" name="to" value={to} />
            <Field label="Αναζήτηση" htmlFor="q" className="md:col-span-3">
              <Input
                id="q"
                name="q"
                defaultValue={search}
                placeholder="Πελάτης, ΑΦΜ, σειρά..."
              />
            </Field>
            <Field label="Πελάτης" htmlFor="client" className="md:col-span-3">
              <Select id="client" name="client" defaultValue={clientFilter}>
                <option value="">Όλοι</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.tradeName ?? c.legalName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Τύπος" htmlFor="type" className="md:col-span-2">
              <Select id="type" name="type" defaultValue={typeFilter ?? ""}>
                <option value="">Όλοι</option>
                <option value="invoice">Τιμολόγιο</option>
                <option value="service_invoice">Παροχή</option>
                <option value="credit_note">Πιστωτικό</option>
              </Select>
            </Field>
            <Field
              label="Ημέρες καθυστέρησης"
              htmlFor="aging"
              className="md:col-span-2"
            >
              <Select id="aging" name="aging" defaultValue={aging ?? ""}>
                <option value="">
                  Όλα ({money(totalOutstanding)})
                </option>
                <option value="0-30">
                  0–30 ημ. ({money(aggregatedByBucket.b30)})
                </option>
                <option value="31-60">
                  31–60 ημ. ({money(aggregatedByBucket.b60)})
                </option>
                <option value="61-90">
                  61–90 ημ. ({money(aggregatedByBucket.b90)})
                </option>
                <option value="90+">
                  90+ ημ. ({money(aggregatedByBucket.bPlus)})
                </option>
              </Select>
            </Field>
            <div className="md:col-span-2 md:self-end">
              <Field label=" " htmlFor="submit-open">
                <Button
                  type="submit"
                  size="md"
                  className="w-full"
                  icon={Search}
                >
                  Φίλτρο
                </Button>
              </Field>
            </div>
          </form>

          {openDocs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="Δεν υπάρχουν ανεξόφλητα παραστατικά."
                description="Όλα σου τα εκδοθέντα παραστατικά είναι εξοφλημένα."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ημ/νία έκδοσης</th>
                    <th>Πελάτης</th>
                    <th>Παραστατικό</th>
                    <th>Τύπος</th>
                    <th className="text-right">Σύνολο</th>
                    <th className="text-right">Έχει εισπραχθεί</th>
                    <th className="text-right">Υπόλοιπο</th>
                    <th>Αδράνεια</th>
                    <th className="text-right" />
                  </tr>
                </thead>
                <tbody>
                  {openDocs.map((d) => {
                    const totalOwed = Number(d.totalAmount);
                    const paid = paidPerDoc.get(d.id) ?? 0;
                    const outstanding = Math.max(0, totalOwed - paid);
                    const daysOpen = Math.floor(
                      (now.getTime() - d.issueDate.getTime()) / 86_400_000,
                    );
                    const clientLabel = d.client?.legalName ?? "—";
                    const docLabel = `${d.series ?? ""}${d.number ? " #" + d.number : ""}`.trim() ||
                      t.documents.types[d.type];
                    return (
                      <tr key={d.id}>
                        <td className="mono">
                          <Link
                            href={`/app/documents/${d.id}`}
                            className="font-semibold text-brand-800 hover:text-brand-900"
                          >
                            {date(d.issueDate)}
                          </Link>
                        </td>
                        <td className="text-sm text-ink-900">
                          {clientLabel}
                        </td>
                        <td className="mono text-sm">
                          {docLabel}
                        </td>
                        <td>
                          <Badge tone="neutral">
                            {t.documents.types[d.type]}
                          </Badge>
                        </td>
                        <td className="text-right font-semibold">
                          {money(totalOwed)}
                        </td>
                        <td className="text-right text-sm text-ink-700">
                          {paid > 0 ? money(paid) : "—"}
                        </td>
                        <td className="text-right font-extrabold text-red-700">
                          {money(outstanding)}
                        </td>
                        <td>
                          <AgingBadge days={daysOpen} />
                        </td>
                        <td className="text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-2">
                            <RecordPaymentForDocButton
                              documentId={d.id}
                              clientId={d.clientId}
                              outstanding={outstanding}
                              clientLabel={clientLabel}
                              docLabel={docLabel}
                            />
                            <MarkAsPaidButton
                              documentId={d.id}
                              docLabel={docLabel}
                              clientLabel={clientLabel}
                              outstanding={outstanding}
                            />
                          </div>
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

      <Pagination
        currentPage={openPage}
        totalPages={Math.max(1, Math.ceil(totalOpen / openSize))}
        totalCount={totalOpen}
        pageSize={openSize}
        buildHref={(p) =>
          "/app/payments?" +
          new URLSearchParams({
            ...openQueryBase,
            openPage: String(p),
            openSize: String(openSize),
          }).toString()
        }
        sizeHref={(s) =>
          "/app/payments?" +
          new URLSearchParams({
            ...openQueryBase,
            openPage: "1",
            openSize: String(s),
          }).toString()
        }
      />

      {/* Payment history */}
      <Card className="mt-8 overflow-hidden">
        <CardHeader
          title="Ιστορικό εισπράξεων"
          subtitle={`${totalPayments.toLocaleString("el-GR")} συνολικές καταχωρήσεις`}
        />
        <CardBody className="p-0">
          <form
            method="get"
            className="grid gap-3 border-b-2 border-ink-200 bg-white p-4 md:grid-cols-12"
          >
            <input type="hidden" name="q" value={search} />
            <input type="hidden" name="client" value={clientFilter} />
            <input type="hidden" name="type" value={typeFilter ?? ""} />
            {aging && <input type="hidden" name="aging" value={aging} />}
            <Field label="Μέθοδος" htmlFor="method" className="md:col-span-3">
              <Select id="method" name="method" defaultValue={methodFilter}>
                <option value="">Όλες</option>
                <option value="cash">Μετρητά</option>
                <option value="card">Κάρτα</option>
                <option value="bank_transfer">Τραπεζική</option>
                <option value="iris">IRIS</option>
                <option value="check">Επιταγή</option>
                <option value="credit">Επί πιστώσει</option>
                <option value="other">Άλλο</option>
              </Select>
            </Field>
            <Field label="Από" htmlFor="from" className="md:col-span-3">
              <Input id="from" name="from" type="date" defaultValue={from} />
            </Field>
            <Field label="Έως" htmlFor="to" className="md:col-span-3">
              <Input id="to" name="to" type="date" defaultValue={to} />
            </Field>
            <div className="md:col-span-3 md:self-end">
              <Field label=" " htmlFor="submit-history">
                <Button
                  type="submit"
                  size="md"
                  className="w-full"
                  icon={Search}
                >
                  Φίλτρο
                </Button>
              </Field>
            </div>
          </form>

          {payments.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="Δεν υπάρχουν εισπράξεις ακόμη."
                description="Καταχώρησε είσπραξη από ένα εκδοθέν παραστατικό."
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

      <Pagination
        currentPage={currentPage}
        totalPages={Math.max(1, Math.ceil(totalPayments / pageSize))}
        totalCount={totalPayments}
        pageSize={pageSize}
        buildHref={(p) =>
          "/app/payments?" +
          new URLSearchParams({
            ...historyQueryBase,
            page: String(p),
            size: String(pageSize),
          }).toString()
        }
        sizeHref={(s) =>
          "/app/payments?" +
          new URLSearchParams({
            ...historyQueryBase,
            page: "1",
            size: String(s),
          }).toString()
        }
      />
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone?: "warning" | "danger";
}) {
  const valueColor =
    tone === "danger"
      ? "text-red-700"
      : tone === "warning"
        ? "text-amber-700"
        : "text-brand-900";
  const iconBg =
    tone === "danger"
      ? "bg-red-100 text-red-700"
      : tone === "warning"
        ? "bg-amber-100 text-amber-700"
        : "bg-brand-50 text-brand-800";
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-500">
              {label}
            </p>
            <p className={`mt-2 text-3xl font-extrabold ${valueColor}`}>
              {value}
            </p>
            <p className="mt-1 text-sm text-ink-700">{hint}</p>
          </div>
          <div className={`grid h-10 w-10 place-items-center rounded-2xl ${iconBg}`}>
            {icon}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function AgingBadge({ days }: { days: number }) {
  if (days <= 30)
    return <Badge tone="brand">{days} ημ.</Badge>;
  if (days <= 60)
    return <Badge tone="warning">{days} ημ.</Badge>;
  if (days <= 90)
    return <Badge tone="warning">{days} ημ.</Badge>;
  return <Badge tone="danger">{days} ημ.</Badge>;
}
