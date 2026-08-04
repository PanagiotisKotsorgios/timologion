import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AdminExportButton } from "@/components/admin/AdminExportButton";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { SortableTh } from "@/components/admin/SortableTh";
import {
  parsePagination,
  parseSearch,
  parseSort,
  parseDateRange,
  whereDate,
} from "@/lib/admin-list";
import { money, date } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { DocumentStatus, DocumentType, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["issueDate", "totalAmount", "type", "status", "createdAt"] as const;

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) {
    if (typeof v === "string") sp.set(k, v);
  }

  const pag = parsePagination(sp);
  const search = parseSearch(sp);
  const range = parseDateRange(sp);
  const sort = parseSort(sp, SORT_FIELDS, {
    field: "createdAt",
    dir: "desc",
  });
  const status = (sp.get("status") ?? "") as DocumentStatus | "";
  const type = (sp.get("type") ?? "") as DocumentType | "";

  const where: Prisma.DocumentWhereInput = {
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(whereDate("issueDate", range) as Prisma.DocumentWhereInput),
    ...(search
      ? {
          OR: [
            { business: { legalName: { contains: search } } },
            { business: { vatNumber: { contains: search } } },
            { client: { legalName: { contains: search } } },
            { series: { contains: search } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.DocumentOrderByWithRelationInput = sort.field
    ? { [sort.field]: sort.dir }
    : { createdAt: "desc" };

  const [rows, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy,
      take: pag.take,
      skip: pag.skip,
      include: {
        business: {
          select: { id: true, legalName: true, tradeName: true, vatNumber: true },
        },
        client: { select: { legalName: true } },
      },
    }),
    prisma.document.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title="Παραστατικά (όλες οι επιχειρήσεις)"
        subtitle={`${total.toLocaleString("el-GR")} παραστατικά με τα τρέχοντα φίλτρα`}
        actions={
          <AdminExportButton
            entity="documents"
            params={{ q: search, status }}
          />
        }
      />

      <AdminListToolbar
        action="/admin/documents"
        search={search}
        from={sp.get("from") ?? ""}
        to={sp.get("to") ?? ""}
        hidden={{ status, type }}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Chip
          href="/admin/documents"
          label="Όλα"
          active={!status && !type}
        />
        <Chip
          href="/admin/documents?status=draft"
          label={t.status.draft}
          active={status === "draft"}
        />
        <Chip
          href="/admin/documents?status=issued"
          label={t.status.issued}
          active={status === "issued"}
        />
        <Chip
          href="/admin/documents?status=failed"
          label={t.status.failed}
          active={status === "failed"}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-100 text-xs uppercase tracking-wide">
              <tr>
                <SortableTh
                  field="issueDate"
                  label="Ημ/νία"
                  current={sort}
                  basePath="/admin/documents"
                  params={sp}
                  className="px-4 py-2 text-left"
                />
                <th className="px-4 py-2 text-left text-ink-500">Επιχείρηση</th>
                <SortableTh
                  field="type"
                  label="Τύπος"
                  current={sort}
                  basePath="/admin/documents"
                  params={sp}
                  className="px-4 py-2 text-left"
                />
                <th className="px-4 py-2 text-left text-ink-500">Πελάτης</th>
                <SortableTh
                  field="totalAmount"
                  label="Σύνολο"
                  current={sort}
                  basePath="/admin/documents"
                  params={sp}
                  className="px-4 py-2 text-right"
                />
                <SortableTh
                  field="status"
                  label="Κατάσταση"
                  current={sort}
                  basePath="/admin/documents"
                  params={sp}
                  className="px-4 py-2 text-left"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/60">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-ink-500">
                    Δεν βρέθηκαν παραστατικά με τα τρέχοντα φίλτρα.
                  </td>
                </tr>
              )}
              {rows.map((d) => (
                <tr
                  key={d.id}
                  className="transition-colors hover:bg-brand-50/60"
                >
                  <td className="px-4 py-2 text-ink-500">
                    <Link
                      href={`/admin/documents/${d.id}`}
                      className="block"
                    >
                      {date(d.issueDate)}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/businesses/${d.business.id}`}
                      className="font-medium text-brand-700 hover:text-brand-800"
                    >
                      {d.business.tradeName ?? d.business.legalName}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/documents/${d.id}`}
                      className="block"
                    >
                      {t.documents.types[d.type]}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-ink-700">
                    {d.client?.legalName ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    <Link
                      href={`/admin/documents/${d.id}`}
                      className="block"
                    >
                      {money(d.totalAmount)}
                    </Link>
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
                      {t.status[d.status as keyof typeof t.status] ?? d.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AdminPagination
        basePath="/admin/documents"
        params={sp}
        page={pag.page}
        pageSize={pag.pageSize}
        total={total}
        pageSizes={[20, 50, 100]}
      />
    </>
  );
}

function Chip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-full border-2 px-3 py-1 text-xs font-bold " +
        (active
          ? "border-brand-800 bg-brand-700 text-white"
          : "border-ink-300 bg-white text-ink-700 hover:border-ink-500")
      }
    >
      {label}
    </Link>
  );
}
