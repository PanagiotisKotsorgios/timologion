import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { PackagePlus, Search, Download } from "lucide-react";
import { LinkButton, Button } from "@/components/ui/Button";
import { ImportButton } from "./ImportDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Field } from "@/components/ui/Input";
import { money } from "@/lib/format";

type Sort = "name" | "recent" | "price_desc" | "price_asc";

type SearchParams = {
  q?: string;
  kind?: "service" | "product";
  vat?: string;
  sort?: Sort;
};

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "item:read");

  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const kind = params.kind;
  const vat = params.vat?.trim() ?? "";
  const sort = (params.sort ?? "name") as Sort;

  const where = {
    businessId: ctx.businessId,
    ...(kind ? { kind } : {}),
    ...(vat ? { vatRate: Number(vat) } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
          ],
        }
      : {}),
  };

  const orderBy =
    sort === "recent"
      ? { createdAt: "desc" as const }
      : sort === "price_desc"
        ? { defaultPrice: "desc" as const }
        : sort === "price_asc"
          ? { defaultPrice: "asc" as const }
          : { name: "asc" as const };

  const rows = await prisma.item.findMany({
    where,
    orderBy,
    take: 200,
  });

  return (
    <>
      <PageHeader
        title="Είδη & Υπηρεσίες"
        subtitle="Διαχείριση καταλόγου"
        actions={
          <>
            <ImportButton />
            <LinkButton
              href="/api/export/items"
              variant="secondary"
              icon={Download}
            >
              Εξαγωγή CSV
            </LinkButton>
            <LinkButton href="/app/items/new" icon={PackagePlus}>
              Νέο είδος
            </LinkButton>
          </>
        }
      />

      <FilterBar search={search} kind={kind} vat={vat} sort={sort} />

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Δεν βρέθηκαν είδη."
              description="Δοκίμασε άλλα φίλτρα ή πρόσθεσε ένα νέο."
              action={
                <LinkButton href="/app/items/new" icon={PackagePlus}>
                  Νέο είδος
                </LinkButton>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Τύπος</th>
                  <th>Κωδικός</th>
                  <th>Ονομασία</th>
                  <th>Μονάδα</th>
                  <th className="text-right">Τιμή</th>
                  <th className="text-right">ΦΠΑ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <Badge tone={it.kind === "product" ? "brand" : "neutral"}>
                        {it.kind === "product" ? "Προϊόν" : "Υπηρεσία"}
                      </Badge>
                    </td>
                    <td className="mono">{it.code ?? "—"}</td>
                    <td>
                      <Link
                        href={`/app/items/${it.id}`}
                        className="font-semibold text-brand-800 hover:text-brand-900"
                      >
                        {it.name}
                      </Link>
                    </td>
                    <td>{it.unit}</td>
                    <td className="text-right font-semibold">
                      {money(it.defaultPrice)}
                    </td>
                    <td className="text-right">
                      {it.vatRate.toString()}%
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

function FilterBar({
  search,
  kind,
  vat,
  sort,
}: {
  search: string;
  kind?: string;
  vat: string;
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
          placeholder="Ονομασία ή κωδικός..."
        />
      </Field>
      <Field label="Τύπος" htmlFor="kind" className="md:col-span-2">
        <Select id="kind" name="kind" defaultValue={kind ?? ""}>
          <option value="">Όλα</option>
          <option value="service">Υπηρεσίες</option>
          <option value="product">Προϊόντα</option>
        </Select>
      </Field>
      <Field label="ΦΠΑ" htmlFor="vat" className="md:col-span-2">
        <Select id="vat" name="vat" defaultValue={vat}>
          <option value="">Όλα</option>
          <option value="0">0%</option>
          <option value="6">6%</option>
          <option value="13">13%</option>
          <option value="24">24%</option>
        </Select>
      </Field>
      <Field label="Ταξινόμηση" htmlFor="sort" className="md:col-span-2">
        <Select id="sort" name="sort" defaultValue={sort}>
          <option value="name">Ονομασία (Α–Ω)</option>
          <option value="recent">Πιο πρόσφατα</option>
          <option value="price_desc">Τιμή ↓</option>
          <option value="price_asc">Τιμή ↑</option>
        </Select>
      </Field>
      <div className="md:col-span-2 md:self-end">
        <Field label=" " htmlFor="submit">
          <Button type="submit" size="md" className="w-full" icon={Search}>
            Εφαρμογή
          </Button>
        </Field>
      </div>
    </form>
  );
}
