import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PosCart } from "../PosCart";

export const dynamic = "force-dynamic";

export default async function PosTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const { id } = await params;

  const tab = await prisma.posTab.findFirst({
    where: { id, businessId: ctx.businessId },
    include: {
      table: true,
      items: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!tab) notFound();

  const items = await prisma.item.findMany({
    where: { businessId: ctx.businessId, active: true },
    orderBy: { name: "asc" },
    take: 200,
    select: {
      id: true,
      name: true,
      defaultPrice: true,
      vatRate: true,
    },
  });

  const isClosed = tab.status !== "open";
  const title = tab.table?.label
    ? `${tab.table.label}`
    : tab.label ?? `Λογαριασμός #${tab.id.slice(-6)}`;

  return (
    <>
      <PageHeader
        title={title}
        subtitle={
          isClosed
            ? "Λογαριασμός κλειστός"
            : "Πάτησε ένα είδος για να το προσθέσεις στο καλάθι."
        }
        actions={
          <div className="flex gap-2">
            <LinkButton
              href="/app/pos"
              variant="secondary"
              icon={ArrowLeft}
            >
              Πίσω
            </LinkButton>
            <LinkButton
              href={`/app/pos/${tab.id}/receipt`}
              variant="secondary"
              icon={Printer}
            >
              Εκτύπωση απόδειξης
            </LinkButton>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <Card>
          <CardHeader
            title="Είδη"
            subtitle={`${items.length} διαθέσιμα`}
          />
          <CardBody>
            {items.length === 0 ? (
              <p className="text-sm text-ink-500">
                Δεν έχεις είδη ακόμα. Προσθέτεις από την ενότητα Είδη &
                Υπηρεσίες.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {items.map((it) => (
                  <ItemButton
                    key={it.id}
                    tabId={tab.id}
                    itemId={it.id}
                    name={it.name}
                    price={it.defaultPrice.toString()}
                    vat={it.vatRate.toString()}
                    disabled={isClosed}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <PosCart
          tabId={tab.id}
          isClosed={isClosed}
          initial={{
            items: tab.items.map((i) => ({
              id: i.id,
              name: i.name,
              quantity: Number(i.quantity),
              unitPrice: Number(i.unitPrice),
              vatRate: Number(i.vatRate),
            })),
            netTotal: Number(tab.netTotal),
            vatTotal: Number(tab.vatTotal),
            total: Number(tab.total),
          }}
        />
      </div>
    </>
  );
}

function ItemButton({
  tabId,
  itemId,
  name,
  price,
  vat,
  disabled,
}: {
  tabId: string;
  itemId: string;
  name: string;
  price: string;
  vat: string;
  disabled: boolean;
}) {
  return (
    <form
      action={async (fd: FormData) => {
        "use server";
        const { addTabItemAction } = await import("../actions");
        await addTabItemAction(fd);
      }}
    >
      <input type="hidden" name="tabId" value={tabId} />
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="quantity" value="1" />
      <input type="hidden" name="unitPrice" value={price} />
      <input type="hidden" name="vatRate" value={vat} />
      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-xl border-2 border-ink-200 bg-white p-3 text-left shadow-sm transition-colors hover:border-brand-700 hover:bg-brand-50 disabled:opacity-60"
      >
        <p className="line-clamp-2 text-sm font-semibold text-brand-900">
          {name}
        </p>
        <p className="mt-1 text-xs font-bold text-brand-700">€{price}</p>
      </button>
    </form>
  );
}
