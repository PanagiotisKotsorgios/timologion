import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { FilePlus2, BarChart3, Search, Download } from "lucide-react";
import { LinkButton, Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Field } from "@/components/ui/Input";
import { t } from "@/lib/i18n";
import { date, money } from "@/lib/format";
import type { DocumentStatus, DocumentType, Prisma } from "@prisma/client";
import { RowActions } from "./RowActions";

type Sort = "recent" | "oldest" | "amount_desc" | "amount_asc";

type SearchParams = {
  q?: string;
  status?: DocumentStatus;
  type?: DocumentType;
  from?: string;
  to?: string;
  sort?: Sort;
};

const DOC_TYPES: DocumentType[] = [
  "invoice",
  "service_invoice",
  "retail_receipt",
  "service_receipt",
  "credit_note",
  "proforma",
  "quote",
  "order",
  "delivery_note",
];

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");

  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const status = params.status;
  const type = params.type;
  const from = params.from ?? "";
  const to = params.to ?? "";
  const sort = (params.sort ?? "recent") as Sort;

  const issueDate: Prisma.DateTimeFilter | undefined =
    from || to
      ? {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
        }
      : undefined;

  const where: Prisma.DocumentWhereInput = {
    businessId: ctx.businessId,
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(issueDate ? { issueDate } : {}),
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

  const orderBy: Prisma.DocumentOrderByWithRelationInput =
    sort === "oldest"
      ? { issueDate: "asc" }
      : sort === "amount_desc"
        ? { totalAmount: "desc" }
        : sort === "amount_asc"
          ? { totalAmount: "asc" }
          : { issueDate: "desc" };

  const rows = await prisma.document.findMany({
    where,
    orderBy,
    take: 100,
    include: { client: { select: { legalName: true } } },
    // Pull the Wrapp URL so the row menu can offer "Δημόσιος σύνδεσμος".
    // (wrappInvoiceUrl is on the base Document select — no join needed.)
  });

  return (
    <>
      <PageHeader
        title="Παραστατικά"
        subtitle={`${rows.length} αποτελέσματα`}
        actions={
          <>
            <LinkButton
              href="/api/export/documents"
              variant="secondary"
              icon={Download}
            >
              Εξαγωγή CSV
            </LinkButton>
            <LinkButton
              href="/app/documents/statistics"
              variant="secondary"
              icon={BarChart3}
            >
              Στατιστικά
            </LinkButton>
            <LinkButton href="/app/documents/new" icon={FilePlus2}>
              Νέο Παραστατικό
            </LinkButton>
          </>
        }
      />

      <FilterBar
        search={search}
        status={status}
        type={type}
        from={from}
        to={to}
        sort={sort}
      />

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Δεν βρέθηκαν παραστατικά."
              description="Δοκίμασε να αλλάξεις τα φίλτρα ή να δημιουργήσεις ένα πρόχειρο."
              action={
                <LinkButton href="/app/documents/new" icon={FilePlus2}>
                  Νέο Παραστατικό
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
                  <th>Τύπος</th>
                  <th>Πελάτης</th>
                  <th className="text-right">Σύνολο</th>
                  <th>Κατάσταση</th>
                  <th className="text-right"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} title="Δεξί κλικ για γρήγορες ενέργειες">
                    <td className="mono">
                      <Link
                        href={`/app/documents/${d.id}`}
                        className="font-semibold text-brand-800 hover:text-brand-900"
                      >
                        {date(d.issueDate)}
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/app/documents/${d.id}`}
                        className="font-semibold text-brand-800 hover:text-brand-900"
                      >
                        {t.documents.types[d.type]}
                      </Link>
                      {d.series && (
                        <span className="ml-2 text-xs text-ink-500">
                          {d.series}
                          {d.number ? ` #${d.number}` : ""}
                        </span>
                      )}
                    </td>
                    <td>{d.client?.legalName ?? "—"}</td>
                    <td className="text-right font-semibold">
                      {money(d.totalAmount)}
                    </td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="text-right">
                      <RowActions
                        id={d.id}
                        status={d.status}
                        wrappInvoiceUrl={d.wrappInvoiceUrl}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  switch (status) {
    case "issued":
      return <Badge tone="success">{t.status.issued}</Badge>;
    case "sending":
      return <Badge tone="brand">{t.status.sending}</Badge>;
    case "failed":
      return <Badge tone="danger">{t.status.failed}</Badge>;
    case "cancelled":
      return <Badge tone="muted">{t.status.cancelled}</Badge>;
    default:
      return <Badge>{t.status.draft}</Badge>;
  }
}

function FilterBar({
  search,
  status,
  type,
  from,
  to,
  sort,
}: {
  search: string;
  status?: DocumentStatus;
  type?: DocumentType;
  from: string;
  to: string;
  sort: string;
}) {
  return (
    <form
      method="get"
      className="mb-5 grid gap-3 rounded-2xl border-2 border-ink-300 bg-white p-4 md:grid-cols-12"
    >
      <Field label="Αναζήτηση" htmlFor="q" className="md:col-span-4">
        <Input
          id="q"
          name="q"
          defaultValue={search}
          placeholder="Πελάτης, ΑΦΜ ή σειρά..."
        />
      </Field>
      <Field label="Τύπος" htmlFor="type" className="md:col-span-3">
        <Select id="type" name="type" defaultValue={type ?? ""}>
          <option value="">Όλοι οι τύποι</option>
          {DOC_TYPES.map((d) => (
            <option key={d} value={d}>
              {t.documents.types[d]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Κατάσταση" htmlFor="status" className="md:col-span-2">
        <Select id="status" name="status" defaultValue={status ?? ""}>
          <option value="">Όλες</option>
          <option value="draft">Πρόχειρο</option>
          <option value="issued">Εκδόθηκε</option>
          <option value="sending">Απεστάλη</option>
          <option value="failed">Σφάλμα</option>
          <option value="cancelled">Ακυρωμένο</option>
        </Select>
      </Field>
      <Field label="Ταξινόμηση" htmlFor="sort" className="md:col-span-3">
        <Select id="sort" name="sort" defaultValue={sort}>
          <option value="recent">Πιο πρόσφατα</option>
          <option value="oldest">Πιο παλιά</option>
          <option value="amount_desc">Ποσό ↓</option>
          <option value="amount_asc">Ποσό ↑</option>
        </Select>
      </Field>
      <Field label="Από" htmlFor="from" className="md:col-span-3">
        <Input id="from" name="from" type="date" defaultValue={from} />
      </Field>
      <Field label="Έως" htmlFor="to" className="md:col-span-3">
        <Input id="to" name="to" type="date" defaultValue={to} />
      </Field>
      <div className="md:col-span-6 md:self-end">
        <Field label=" " htmlFor="submit">
          <Button type="submit" size="md" className="w-full" icon={Search}>
            Εφαρμογή φίλτρων
          </Button>
        </Field>
      </div>
    </form>
  );
}
