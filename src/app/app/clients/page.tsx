import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { UserPlus, Search, ArrowLeft, ArrowRight, Download } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select, Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Sort = "name" | "recent" | "vat";

type SearchParams = {
  q?: string;
  sort?: Sort;
  city?: string;
  hasEmail?: string;
  tag?: string;
  page?: string;
};

const PAGE_SIZE = 20;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:read");

  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const sort = (params.sort ?? "name") as Sort;
  const cityFilter = params.city?.trim() ?? "";
  const onlyWithEmail = params.hasEmail === "1";
  const tagFilter = params.tag?.trim() ?? "";
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);

  const where = {
    businessId: ctx.businessId,
    ...(search
      ? {
          OR: [
            { legalName: { contains: search } },
            { tradeName: { contains: search } },
            { vatNumber: { contains: search } },
          ],
        }
      : {}),
    ...(cityFilter ? { city: { equals: cityFilter } } : {}),
    ...(onlyWithEmail ? { email: { not: null } } : {}),
    ...(tagFilter
      ? { tagLinks: { some: { tagId: tagFilter } } }
      : {}),
  };

  const orderBy =
    sort === "recent"
      ? { createdAt: "desc" as const }
      : sort === "vat"
        ? { vatNumber: "asc" as const }
        : { legalName: "asc" as const };

  const [rows, total, cities, tags] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy,
      take: PAGE_SIZE,
      skip: (currentPage - 1) * PAGE_SIZE,
      include: { tagLinks: { include: { tag: true } } },
    }),
    prisma.client.count({ where }),
    prisma.client.findMany({
      where: { businessId: ctx.businessId, city: { not: null } },
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" },
      take: 100,
    }),
    prisma.tag.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { label: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Πελάτες"
        subtitle={`${total} ${total === 1 ? "πελάτης" : "πελάτες"} συνολικά`}
        actions={
          <>
            <LinkButton
              href="/api/export/clients"
              variant="secondary"
              icon={Download}
            >
              Εξαγωγή CSV
            </LinkButton>
            <LinkButton href="/app/clients/new" icon={UserPlus}>
              Νέος Πελάτης
            </LinkButton>
          </>
        }
      />

      <FilterBar
        search={search}
        sort={sort}
        city={cityFilter}
        onlyWithEmail={onlyWithEmail}
        cities={cities.map((c) => c.city!).filter(Boolean)}
        tag={tagFilter}
        tags={tags.map((t) => ({ id: t.id, label: t.label, color: t.color }))}
      />

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={
                search || cityFilter || onlyWithEmail
                  ? "Δεν βρέθηκαν πελάτες."
                  : "Δεν έχεις πελάτες ακόμα."
              }
              description={
                search || cityFilter || onlyWithEmail
                  ? "Δοκίμασε να καθαρίσεις τα φίλτρα."
                  : "Πρόσθεσε τον πρώτο πελάτη για να ξεκινήσεις."
              }
              action={
                <LinkButton href="/app/clients/new" icon={UserPlus}>
                  Νέος Πελάτης
                </LinkButton>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Επωνυμία</th>
                  <th>ΑΦΜ</th>
                  <th>Πόλη</th>
                  <th>Email</th>
                  <th>Τηλέφωνο</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/app/clients/${c.id}`}
                        className="font-semibold text-brand-800 hover:text-brand-900"
                      >
                        {c.legalName}
                      </Link>
                      {c.tradeName && (
                        <div className="text-xs text-ink-500">
                          {c.tradeName}
                        </div>
                      )}
                      {c.tagLinks.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.tagLinks.map((l) => (
                            <span
                              key={l.tagId}
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                              style={{ background: l.tag.color }}
                            >
                              {l.tag.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="mono">{c.vatNumber ?? "—"}</td>
                    <td>{c.city ?? "—"}</td>
                    <td>{c.email ?? "—"}</td>
                    <td>{c.phone ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          buildHref={(p) =>
            "/app/clients?" +
            new URLSearchParams({
              q: search,
              sort,
              city: cityFilter,
              hasEmail: onlyWithEmail ? "1" : "",
              tag: tagFilter,
              page: String(p),
            }).toString()
          }
        />
      )}
    </>
  );
}

function FilterBar({
  search,
  sort,
  city,
  onlyWithEmail,
  cities,
  tag,
  tags,
}: {
  search: string;
  sort: string;
  city: string;
  onlyWithEmail: boolean;
  cities: string[];
  tag: string;
  tags: { id: string; label: string; color: string }[];
}) {
  return (
    <form
      method="get"
      className="mb-5 grid gap-3 rounded-2xl border-2 border-ink-300 bg-white p-4 md:grid-cols-12"
    >
      <Field label="Αναζήτηση" htmlFor="q" className="md:col-span-5">
        <Input
          id="q"
          name="q"
          defaultValue={search}
          placeholder="Επωνυμία, τίτλος ή ΑΦΜ..."
        />
      </Field>
      <Field label="Ταξινόμηση" htmlFor="sort" className="md:col-span-3">
        <Select id="sort" name="sort" defaultValue={sort}>
          <option value="name">Επωνυμία (Α–Ω)</option>
          <option value="recent">Πιο πρόσφατοι πρώτα</option>
          <option value="vat">ΑΦΜ (αύξουσα)</option>
        </Select>
      </Field>
      <Field label="Πόλη" htmlFor="city" className="md:col-span-2">
        <Select id="city" name="city" defaultValue={city}>
          <option value="">Όλες</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Ετικέτα" htmlFor="tag" className="md:col-span-2">
        <Select id="tag" name="tag" defaultValue={tag}>
          <option value="">Όλες</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="md:col-span-2 md:self-end">
        <Field label=" " htmlFor="submit">
          <Button type="submit" size="md" className="w-full" icon={Search}>
            Εφαρμογή
          </Button>
        </Field>
      </div>
      <div className="md:col-span-12 -mt-1 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-ink-900">
          <input
            type="checkbox"
            name="hasEmail"
            value="1"
            defaultChecked={onlyWithEmail}
            className="h-4 w-4 rounded border-ink-500 text-brand-700"
          />
          Μόνο με email
        </label>
      </div>
    </form>
  );
}

function Pagination({
  currentPage,
  totalPages,
  buildHref,
}: {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  return (
    <nav className="mt-6 flex items-center justify-between text-sm">
      <span className="text-ink-700">
        Σελίδα <strong>{currentPage}</strong> από <strong>{totalPages}</strong>
      </span>
      <div className="flex gap-2">
        {currentPage > 1 && (
          <LinkButton
            href={buildHref(currentPage - 1)}
            variant="secondary"
            size="sm"
            icon={ArrowLeft}
          >
            Προηγούμενη
          </LinkButton>
        )}
        {currentPage < totalPages && (
          <LinkButton
            href={buildHref(currentPage + 1)}
            variant="secondary"
            size="sm"
            iconRight={ArrowRight}
          >
            Επόμενη
          </LinkButton>
        )}
      </div>
    </nav>
  );
}
