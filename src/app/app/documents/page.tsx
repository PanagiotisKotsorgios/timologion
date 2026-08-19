import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { FilePlus2, BarChart3, Search, Repeat } from "lucide-react";
import { LinkButton, Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Field } from "@/components/ui/Input";
import { t } from "@/lib/i18n";
import { date, money } from "@/lib/format";
import type { DocumentStatus, DocumentType, Prisma } from "@prisma/client";
import { RowActions } from "./RowActions";
import { ClickableRow } from "../ClickableRow";
import {
  BulkDeleteBar,
  BulkDraftsProvider,
  DraftRowCheckbox,
  DraftSelectAllCheckbox,
} from "./BulkDrafts";
import { Pagination, resolvePageSize } from "@/components/ui/Pagination";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { DocTypeFilterSelect } from "./DocTypeFilterSelect";

type Sort = "recent" | "oldest" | "amount_desc" | "amount_asc";

type SearchParams = {
  q?: string;
  status?: DocumentStatus;
  type?: DocumentType;
  from?: string;
  to?: string;
  sort?: Sort;
  page?: string;
  size?: string;
};

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
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const pageSize = resolvePageSize(params.size);

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

  const [rows, total, sumsForFilter] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy,
      take: pageSize,
      skip: (currentPage - 1) * pageSize,
      include: { client: { select: { legalName: true } } },
      // Pull the Wrapp URL so the row menu can offer "Δημόσιος σύνδεσμος".
      // (wrappInvoiceUrl is on the base Document select — no join needed.)
    }),
    prisma.document.count({ where }),
    // Totals aggregate the ENTIRE filtered set, not just the current page —
    // otherwise sums shown at the bottom would only be for the visible 20-50
    // rows, which is misleading. Costs one extra query per page load.
    prisma.document.aggregate({
      where,
      _sum: {
        netTotalAmount: true,
        vatTotalAmount: true,
        totalAmount: true,
      },
    }),
  ]);
  const filterNetSum = Number(sumsForFilter._sum.netTotalAmount ?? 0);
  const filterVatSum = Number(sumsForFilter._sum.vatTotalAmount ?? 0);
  const filterTotalSum = Number(sumsForFilter._sum.totalAmount ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const draftIdsOnPage = rows.filter((r) => r.status === "draft").map((r) => r.id);

  // Which docs on this page already have a credit note issued against
  // them — used to hide the "Έκδοση πιστωτικού" menu item so you can't
  // credit the same invoice twice. Only 5.1 (credit_note_correlated) and
  // 11.4 (retail_credit_note) reference the parent via correlatedDocumentId;
  // uncorrelated 5.2 credit notes are impossible to link back here.
  const issuedIdsOnPage = rows
    .filter((r) => r.status === "issued")
    .map((r) => r.id);
  const parentIdsWithCreditNote = new Set<string>();
  if (issuedIdsOnPage.length > 0) {
    const children = await prisma.document.findMany({
      where: {
        businessId: ctx.businessId,
        correlatedDocumentId: { in: issuedIdsOnPage },
        type: {
          in: [
            "credit_note_correlated",
            "retail_credit_note",
            "credit_note",
          ],
        },
        // Every status EXCEPT "cancelled" — a live/pending/failed
        // credit note all count as "already exists, don't double-credit."
        status: { in: ["draft", "sending", "issued", "failed"] },
      },
      select: { correlatedDocumentId: true },
    });
    for (const c of children) {
      if (c.correlatedDocumentId) {
        parentIdsWithCreditNote.add(c.correlatedDocumentId);
      }
    }
  }

  const baseQuery = {
    q: search,
    status: status ?? "",
    type: type ?? "",
    from,
    to,
    sort,
  };

  return (
    <>
      <PageHeader
        title="Παραστατικά"
        subtitle={`${total.toLocaleString("el-GR")} ${total === 1 ? "αποτέλεσμα" : "αποτελέσματα"}`}
        actions={
          <>
            <ExportMenu baseUrl="/api/export/documents" />
            <a
              href="/app/documents/statistics"
              className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-sky-700 bg-sky-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-700 sm:h-11 sm:text-base"
            >
              <BarChart3 size={16} strokeWidth={2.5} aria-hidden />
              Στατιστικά
            </a>
            <a
              href="/app/documents/repeating"
              className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-violet-700 bg-violet-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-violet-700 sm:h-11 sm:text-base"
            >
              <Repeat size={16} strokeWidth={2.5} aria-hidden />
              Επαναλαμβανόμενα
            </a>
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

      <BulkDraftsProvider draftIds={draftIdsOnPage}>
        <BulkDeleteBar />
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
                    <th className="w-8">
                      <DraftSelectAllCheckbox />
                    </th>
                    <th>Ημ/νία</th>
                    <th>Τύπος</th>
                    <th>Πελάτης</th>
                    <th className="text-right">Καθαρή</th>
                    <th className="text-right">ΦΠΑ</th>
                    <th className="text-right">Σύνολο</th>
                    <th>Κατάσταση</th>
                    <th className="text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => (
                    <ClickableRow key={d.id}>
                      <td className="w-8 text-center">
                        <DraftRowCheckbox id={d.id} status={d.status} />
                      </td>
                      <td className="mono">
                        <Link
                          href={`/app/documents/${d.id}`}
                          data-row-anchor
                          className="font-semibold text-brand-800 hover:text-brand-900"
                        >
                          {date(d.issueDate)}
                        </Link>
                      </td>
                      <td
                        className="truncate-cell"
                        title={`${t.documents.types[d.type]}${
                          d.series
                            ? " · " + d.series + (d.number ? " #" + d.number : "")
                            : ""
                        }`}
                        style={{ maxWidth: "220px" }}
                      >
                        <span>
                          <span className="font-semibold text-ink-900">
                            {t.documents.types[d.type]}
                          </span>
                          {d.series && (
                            <span className="ml-2 text-sm text-ink-500">
                              {d.series}
                              {d.number ? ` #${d.number}` : ""}
                            </span>
                          )}
                        </span>
                      </td>
                      <td
                        className="truncate-cell"
                        title={d.client?.legalName ?? "—"}
                        style={{ maxWidth: "260px" }}
                      >
                        {d.client?.legalName ?? "—"}
                      </td>
                      <td className="text-right text-sm tabular-nums text-ink-700">
                        {money(d.netTotalAmount)}
                      </td>
                      <td className="text-right text-sm tabular-nums text-ink-700">
                        {money(d.vatTotalAmount)}
                      </td>
                      <td className="text-right font-semibold tabular-nums">
                        {money(d.totalAmount)}
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={d.status} />
                          {d.stagingMode && (
                            <span
                              className="rounded-md border-2 border-amber-400 bg-amber-100 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-800"
                              title="Παραστατικό δοκιμών — τα MARK/UID/QR δεν είναι έγκυρα στο πραγματικό myDATA."
                            >
                              Staging
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                        <RowActions
                          id={d.id}
                          status={d.status}
                          wrappInvoiceUrl={d.wrappInvoiceUrl}
                          hasCreditNote={parentIdsWithCreditNote.has(d.id)}
                        />
                      </td>
                    </ClickableRow>
                  ))}
                </tbody>
                <tfoot className="bg-brand-50 font-bold text-brand-900">
                  <tr>
                    <td colSpan={4} className="px-4 py-3.5 text-right text-[11px] font-black uppercase tracking-widest sm:text-xs">
                      <div className="flex flex-col items-end gap-0.5">
                        <span>Σύνολα</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-800/80">
                          {total.toLocaleString("el-GR")}{" "}
                          {total === 1 ? "εγγραφή" : "εγγραφές"}
                          {total > rows.length ? " · με φίλτρα" : ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm tabular-nums">
                      {money(filterNetSum)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm tabular-nums">
                      {money(filterVatSum)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-base tabular-nums">
                      {money(filterTotalSum)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      </BulkDraftsProvider>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={total}
        pageSize={pageSize}
        buildHref={(p) =>
          "/app/documents?" +
          new URLSearchParams({
            ...baseQuery,
            size: String(pageSize),
            page: String(p),
          }).toString()
        }
        sizeHref={(s) =>
          "/app/documents?" +
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
      className="mb-5 grid gap-3 rounded-2xl border-2 border-ink-300 bg-white p-4 sm:grid-cols-2 lg:grid-cols-12"
    >
      {/* Grid tiers:
          - phone (<640):   single-column stack, every field gets full width
          - sm (640-1024):  2-column grid — pairs 2 fields per row
          - lg (1024+):     12-column grid with the wider layout below
          On lg the search + type get more room since their values are the
          longest ("Τιμολόγιο πώλησης — ενδοκοινοτικό" wouldn't fit in <200px). */}
      <Field label="Αναζήτηση" htmlFor="q" className="lg:col-span-4">
        <Input
          id="q"
          name="q"
          defaultValue={search}
          placeholder="Πελάτης, ΑΦΜ ή σειρά..."
        />
      </Field>
      <Field label="Τύπος" htmlFor="type" className="lg:col-span-4">
        <DocTypeFilterSelect currentValue={type} />
      </Field>
      <Field label="Κατάσταση" htmlFor="status" className="lg:col-span-2">
        <Select id="status" name="status" defaultValue={status ?? ""}>
          <option value="">Όλες</option>
          <option value="draft">Πρόχειρο</option>
          <option value="issued">Εκδόθηκε</option>
          <option value="sending">Απεστάλη</option>
          <option value="failed">Σφάλμα</option>
          <option value="cancelled">Ακυρωμένο</option>
        </Select>
      </Field>
      <Field label="Ταξινόμηση" htmlFor="sort" className="lg:col-span-2">
        <Select id="sort" name="sort" defaultValue={sort}>
          <option value="recent">Πιο πρόσφατα</option>
          <option value="oldest">Πιο παλιά</option>
          <option value="amount_desc">Ποσό ↓</option>
          <option value="amount_asc">Ποσό ↑</option>
        </Select>
      </Field>
      <Field label="Από" htmlFor="from" className="lg:col-span-3">
        <Input id="from" name="from" type="date" defaultValue={from} />
      </Field>
      <Field label="Έως" htmlFor="to" className="lg:col-span-3">
        <Input id="to" name="to" type="date" defaultValue={to} />
      </Field>
      <div className="sm:col-span-2 lg:col-span-6 lg:self-end">
        <Field label=" " htmlFor="submit">
          <Button type="submit" size="md" className="w-full" icon={Search}>
            Εφαρμογή φίλτρων
          </Button>
        </Field>
      </div>
    </form>
  );
}
