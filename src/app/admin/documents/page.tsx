import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { money, date } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { DocumentStatus, DocumentType } from "@prisma/client";

const PAGE_SIZE = 30;

type SearchParams = {
  q?: string;
  status?: DocumentStatus;
  type?: DocumentType;
  page?: string;
};

export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const { q, status, type, page } = await searchParams;
  const search = q?.trim() ?? "";
  const currentPage = Math.max(1, Number(page ?? "1") || 1);

  const where = {
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(search
      ? {
          OR: [
            { business: { legalName: { contains: search } } },
            { business: { vatNumber: { contains: search } } },
            { client: { legalName: { contains: search } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (currentPage - 1) * PAGE_SIZE,
      include: {
        business: {
          select: { id: true, legalName: true, tradeName: true },
        },
        client: { select: { legalName: true } },
      },
    }),
    prisma.document.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Παραστατικά (όλες οι επιχειρήσεις)"
        subtitle={`${total} παραστατικά με τα τρέχοντα φίλτρα`}
      />

      <form className="mb-4 grid gap-3 md:grid-cols-3">
        <Input
          name="q"
          defaultValue={search}
          placeholder="Επιχείρηση, ΑΦΜ ή πελάτης..."
        />
        {status && <input type="hidden" name="status" value={status} />}
        {type && <input type="hidden" name="type" value={type} />}
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        <Chip href="/admin/documents" label="Όλα" active={!status && !type} />
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
        <table className="w-full text-sm">
          <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-2 text-left">Ημ/νία</th>
              <th className="px-4 py-2 text-left">Επιχείρηση</th>
              <th className="px-4 py-2 text-left">Τύπος</th>
              <th className="px-4 py-2 text-left">Πελάτης</th>
              <th className="px-4 py-2 text-right">Σύνολο</th>
              <th className="px-4 py-2 text-left">Κατάσταση</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-300/60">
            {rows.map((d) => (
              <tr key={d.id} className="hover:bg-ink-100/60">
                <td className="px-4 py-2 text-ink-500">{date(d.issueDate)}</td>
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/businesses/${d.business.id}`}
                    className="font-medium text-brand-700 hover:text-brand-800"
                  >
                    {d.business.tradeName ?? d.business.legalName}
                  </Link>
                </td>
                <td className="px-4 py-2">{t.documents.types[d.type]}</td>
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
                    {t.status[d.status as keyof typeof t.status] ?? d.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-500">
            Σελίδα {currentPage} / {totalPages}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <LinkButton
                href={buildUrl({ q: search, status, type, page: currentPage - 1 })}
                variant="secondary"
                size="sm"
              >
                Προηγούμενη
              </LinkButton>
            )}
            {currentPage < totalPages && (
              <LinkButton
                href={buildUrl({ q: search, status, type, page: currentPage + 1 })}
                variant="secondary"
                size="sm"
              >
                Επόμενη
              </LinkButton>
            )}
          </div>
        </nav>
      )}
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
        "rounded-full border px-3 py-1 text-xs font-medium " +
        (active
          ? "border-brand-300 bg-brand-50 text-brand-700"
          : "border-ink-300 bg-white text-ink-700 hover:bg-ink-100")
      }
    >
      {label}
    </Link>
  );
}

function buildUrl(params: {
  q: string;
  status?: string;
  type?: string;
  page: number;
}) {
  const s = new URLSearchParams();
  if (params.q) s.set("q", params.q);
  if (params.status) s.set("status", params.status);
  if (params.type) s.set("type", params.type);
  s.set("page", String(params.page));
  return `/admin/documents?${s.toString()}`;
}
