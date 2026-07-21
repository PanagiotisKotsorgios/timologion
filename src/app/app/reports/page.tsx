import { Download, FileSpreadsheet, Percent, Receipt } from "lucide-react";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = { from?: string; to?: string };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");
  const params = await searchParams;

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const from = params.from ? new Date(params.from) : defaultFrom;
  const to = params.to
    ? new Date(new Date(params.to).setHours(23, 59, 59, 999))
    : new Date(defaultTo.setHours(23, 59, 59, 999));

  const fromIso = from.toISOString().slice(0, 10);
  const toIso = to.toISOString().slice(0, 10);

  const docs = await prisma.document.findMany({
    where: {
      businessId: ctx.businessId,
      status: "issued",
      issueDate: { gte: from, lte: to },
    },
    select: {
      netTotalAmount: true,
      vatTotalAmount: true,
      totalAmount: true,
      lines: { select: { netAmount: true, vatAmount: true, vatRate: true } },
    },
  });

  const totals = docs.reduce(
    (acc, d) => ({
      net: acc.net + Number(d.netTotalAmount),
      vat: acc.vat + Number(d.vatTotalAmount),
      total: acc.total + Number(d.totalAmount),
      count: acc.count + 1,
    }),
    { net: 0, vat: 0, total: 0, count: 0 },
  );

  const perRate = new Map<string, { net: number; vat: number }>();
  for (const d of docs) {
    for (const l of d.lines) {
      const rate = l.vatRate.toString();
      const bucket = perRate.get(rate) ?? { net: 0, vat: 0 };
      bucket.net += Number(l.netAmount);
      bucket.vat += Number(l.vatAmount);
      perRate.set(rate, bucket);
    }
  }
  const rateRows = [...perRate.entries()].sort(
    (a, b) => Number(b[0]) - Number(a[0]),
  );

  const qs = `from=${fromIso}&to=${toIso}`;

  return (
    <>
      <PageHeader
        title="Αναφορές λογιστή"
        subtitle="Εξαγωγές ΦΠΑ και εσόδων-εξόδων για συγκεκριμένη περίοδο."
      />

      <Card className="mb-6">
        <CardBody>
          <form method="get" className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <label
                htmlFor="from"
                className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-500"
              >
                Από
              </label>
              <input
                id="from"
                name="from"
                type="date"
                defaultValue={fromIso}
                className="w-full rounded-lg border-2 border-ink-300 bg-white px-3 py-2.5"
              />
            </div>
            <div>
              <label
                htmlFor="to"
                className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-500"
              >
                Έως
              </label>
              <input
                id="to"
                name="to"
                type="date"
                defaultValue={toIso}
                className="w-full rounded-lg border-2 border-ink-300 bg-white px-3 py-2.5"
              />
            </div>
            <div className="self-end">
              <button
                type="submit"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-brand-700 px-5 text-base font-semibold text-white hover:bg-brand-800"
              >
                Ενημέρωση περιόδου
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <SummaryCard label="Παραστατικά" value={String(totals.count)} />
        <SummaryCard label="Καθαρή αξία" value={money(totals.net)} />
        <SummaryCard label="ΦΠΑ" value={money(totals.vat)} />
        <SummaryCard label="Σύνολο" value={money(totals.total)} highlight />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader
            title="Ανάλυση ΦΠΑ ανά συντελεστή"
            action={<Percent size={16} className="text-ink-500" />}
          />
          <CardBody className="p-0">
            {rateRows.length === 0 ? (
              <p className="p-6 text-sm text-ink-500">
                Δεν βρέθηκαν εκδοθέντα παραστατικά για την περίοδο.
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Συντελεστής</th>
                    <th className="text-right">Καθαρή αξία</th>
                    <th className="text-right">ΦΠΑ</th>
                  </tr>
                </thead>
                <tbody>
                  {rateRows.map(([rate, v]) => (
                    <tr key={rate}>
                      <td className="mono">{rate}%</td>
                      <td className="text-right">{money(v.net)}</td>
                      <td className="text-right font-semibold text-brand-900">
                        {money(v.vat)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Εξαγωγή ΦΠΑ (CSV)"
              action={<Percent size={16} className="text-ink-500" />}
            />
            <CardBody className="space-y-3">
              <p className="text-sm text-ink-700">
                Ανάλυση ανά συντελεστή για την περιοδική δήλωση ΦΠΑ.
              </p>
              <LinkButton
                href={`/api/reports/vat?${qs}`}
                icon={Download}
                variant="secondary"
              >
                Λήψη ΦΠΑ report
              </LinkButton>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Εσόδων-Εξόδων (CSV)"
              action={<Receipt size={16} className="text-ink-500" />}
            />
            <CardBody className="space-y-3">
              <p className="text-sm text-ink-700">
                Μία γραμμή ανά εκδοθέν παραστατικό, με πελάτη, καθαρή αξία, ΦΠΑ
                και σύνολο. Έτοιμο για τον λογιστή σου.
              </p>
              <LinkButton
                href={`/api/reports/journal?${qs}`}
                icon={FileSpreadsheet}
                variant="secondary"
              >
                Λήψη εσόδων-εξόδων
              </LinkButton>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-bold uppercase tracking-widest text-ink-500">
          {label}
        </p>
        <p
          className={
            "mt-2 text-2xl font-extrabold " +
            (highlight ? "text-brand-900" : "text-ink-900")
          }
        >
          {value}
        </p>
      </CardBody>
    </Card>
  );
}
