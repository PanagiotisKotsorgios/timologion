import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PosCart } from "../PosCart";
import { PosItemsGrid } from "../PosItemsGrid";

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
          <div className="flex flex-wrap gap-2">
            <a
              href="/app/pos"
              className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-ink-300 bg-white px-4 text-sm font-bold text-ink-900 shadow-sm transition-colors hover:border-ink-500 hover:bg-ink-100 sm:h-11 sm:text-base"
            >
              <ArrowLeft size={16} strokeWidth={2.5} aria-hidden />
              Πίσω
            </a>
            <a
              href={`/app/pos/${tab.id}/receipt`}
              className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-brand-800 bg-brand-700 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-800 sm:h-11 sm:text-base"
            >
              <Printer size={16} strokeWidth={2.5} aria-hidden />
              Εκτύπωση απόδειξης
            </a>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <Card>
          <CardHeader
            title="Είδη"
            subtitle={`${items.length} διαθέσιμα · Πάτα για γρήγορη προσθήκη στο καλάθι`}
          />
          <CardBody>
            <PosItemsGrid
              tabId={tab.id}
              isClosed={isClosed}
              initialItems={items.map((it) => ({
                id: it.id,
                name: it.name,
                defaultPrice: it.defaultPrice.toString(),
                vatRate: it.vatRate.toString(),
              }))}
            />
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

