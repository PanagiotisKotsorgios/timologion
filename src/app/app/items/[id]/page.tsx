import { notFound } from "next/navigation";
import { Package, Boxes, Tag } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { date, money } from "@/lib/format";
import { ItemForm } from "../ItemForm";
import { StockPanel } from "../StockPanel";
import { PriceTiersPanel } from "../PriceTiersPanel";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "item:read");

  const { id } = await params;

  const item = await prisma.item.findFirst({
    where: { id, businessId: ctx.businessId },
    include: {
      prices: { orderBy: { tier: "asc" } },
      stockMovements: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!item) notFound();

  const stockNumber = item.stockOnHand
    ? Number(item.stockOnHand.toString())
    : null;
  const lowStock =
    stockNumber != null &&
    item.stockAlertAt != null &&
    stockNumber <= Number(item.stockAlertAt.toString());

  return (
    <>
      <PageHeader
        title={item.name}
        subtitle={item.kind === "product" ? "Προϊόν" : "Υπηρεσία"}
        actions={
          lowStock ? (
            <Badge tone="warning">Χαμηλό απόθεμα</Badge>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardBody>
              <ItemForm
                mode="edit"
                initial={{
                  id: item.id,
                  kind: item.kind,
                  code: item.code,
                  name: item.name,
                  description: item.description,
                  unit: item.unit,
                  defaultPrice: item.defaultPrice.toString(),
                  vatRate: item.vatRate.toString(),
                  vatCategory: item.vatCategory,
                  stockOnHand:
                    item.stockOnHand != null
                      ? item.stockOnHand.toString()
                      : null,
                  stockAlertAt:
                    item.stockAlertAt != null
                      ? item.stockAlertAt.toString()
                      : null,
                }}
              />
            </CardBody>
          </Card>

          {item.kind === "product" && item.stockMovements.length > 0 && (
            <Card>
              <CardHeader
                title="Ιστορικό αποθέματος"
                action={<Boxes size={16} className="text-ink-500" />}
              />
              <CardBody className="p-0">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ημ/νία</th>
                      <th>Κίνηση</th>
                      <th className="text-right">Ποσότητα</th>
                      <th>Σημείωση</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.stockMovements.map((m) => (
                      <tr key={m.id}>
                        <td className="mono">{date(m.createdAt)}</td>
                        <td>
                          <Badge
                            tone={
                              m.kind === "in"
                                ? "success"
                                : m.kind === "out"
                                  ? "danger"
                                  : "neutral"
                            }
                          >
                            {m.kind === "in"
                              ? "Εισαγωγή"
                              : m.kind === "out"
                                ? "Έξοδος"
                                : "Απογραφή"}
                          </Badge>
                        </td>
                        <td className="text-right mono">
                          {m.quantity.toString()} {item.unit}
                        </td>
                        <td className="text-ink-700">{m.reason ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Βασική τιμή"
              action={<Package size={16} className="text-ink-500" />}
            />
            <CardBody>
              <p className="text-3xl font-extrabold text-brand-900">
                {money(item.defaultPrice)}
              </p>
              <p className="mt-1 text-sm text-ink-700">
                ΦΠΑ {item.vatRate.toString()}% · {item.unit}
              </p>
            </CardBody>
          </Card>

          {item.kind === "product" && (
            <Card>
              <CardHeader
                title="Απόθεμα"
                action={<Boxes size={16} className="text-ink-500" />}
              />
              <CardBody>
                <StockPanel
                  itemId={item.id}
                  currentStock={stockNumber}
                  unit={item.unit}
                />
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Ζώνες τιμών"
              action={<Tag size={16} className="text-ink-500" />}
            />
            <CardBody>
              <PriceTiersPanel
                itemId={item.id}
                initial={item.prices.map((p) => ({
                  tier: p.tier,
                  price: p.price.toString(),
                }))}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
