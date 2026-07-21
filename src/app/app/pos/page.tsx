import Link from "next/link";
import { UtensilsCrossed, Plus, ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { money, date } from "@/lib/format";
import { NewTabButton } from "./NewTabButton";
import { TableManager } from "./TableManager";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");

  const [tables, openTabs, recentClosed] = await Promise.all([
    prisma.posTable.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { label: "asc" },
      include: {
        tabs: {
          where: { status: "open" },
          select: { id: true, total: true, openedAt: true },
        },
      },
    }),
    prisma.posTab.findMany({
      where: { businessId: ctx.businessId, status: "open" },
      orderBy: { openedAt: "desc" },
      include: { table: { select: { label: true } } },
    }),
    prisma.posTab.findMany({
      where: { businessId: ctx.businessId, status: "closed" },
      orderBy: { closedAt: "desc" },
      take: 5,
      include: { table: { select: { label: true } } },
    }),
  ]);

  const openCounter = openTabs.filter((t) => !t.tableId).length;

  return (
    <>
      <PageHeader
        title="POS — Γρήγορη Πώληση"
        subtitle="Ανοιχτοί λογαριασμοί, τραπέζια εστιατορίου και γρήγορη πώληση πάγκου."
        actions={<NewTabButton />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Τραπέζια"
              subtitle="Κάνε κλικ σε τραπέζι για άνοιγμα λογαριασμού."
              action={<UtensilsCrossed size={16} className="text-ink-500" />}
            />
            <CardBody>
              {tables.length === 0 ? (
                <p className="text-sm text-ink-500">
                  Δεν έχεις τραπέζια ακόμη — τα καταστήματα χωρίς service
                  μπορούν να αγνοήσουν αυτή την ενότητα και να ανοίγουν
                  λογαριασμό πάγκου.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {tables.map((t) => {
                    const activeTab = t.tabs[0];
                    return activeTab ? (
                      <Link
                        key={t.id}
                        href={`/app/pos/${activeTab.id}`}
                        className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 transition-colors hover:border-amber-500"
                      >
                        <p className="text-lg font-bold text-brand-900">
                          {t.label}
                        </p>
                        <p className="text-xs text-ink-700">
                          {t.seats} θέσεις
                        </p>
                        <p className="mt-2 text-sm font-semibold text-amber-800">
                          {money(activeTab.total)} · ανοιχτό
                        </p>
                      </Link>
                    ) : (
                      <NewTableTabForm
                        key={t.id}
                        tableId={t.id}
                        label={t.label}
                        seats={t.seats}
                      />
                    );
                  })}
                </div>
              )}
              <div className="mt-6">
                <TableManager />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={`Ανοιχτοί λογαριασμοί πάγκου (${openCounter})`}
              action={<ShoppingCart size={16} className="text-ink-500" />}
            />
            <CardBody className="p-0">
              {openTabs.filter((t) => !t.tableId).length === 0 ? (
                <p className="p-6 text-sm text-ink-500">
                  Δεν υπάρχουν ανοιχτοί λογαριασμοί πάγκου.
                </p>
              ) : (
                <ul className="divide-y-2 divide-ink-200">
                  {openTabs
                    .filter((t) => !t.tableId)
                    .map((tab) => (
                      <li key={tab.id}>
                        <Link
                          href={`/app/pos/${tab.id}`}
                          className="flex items-center justify-between px-6 py-4 hover:bg-ink-50"
                        >
                          <div>
                            <p className="font-semibold text-brand-900">
                              {tab.label ?? `Λογαριασμός #${tab.id.slice(-6)}`}
                            </p>
                            <p className="text-xs text-ink-500">
                              Άνοιξε {date(tab.openedAt)}
                            </p>
                          </div>
                          <p className="text-lg font-bold text-brand-900">
                            {money(tab.total)}
                          </p>
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Πρόσφατα κλεισμένα" />
          <CardBody className="p-0">
            {recentClosed.length === 0 ? (
              <p className="p-6 text-sm text-ink-500">Καμία κλείσιμη ακόμη.</p>
            ) : (
              <ul className="divide-y divide-ink-200">
                {recentClosed.map((t) => (
                  <li key={t.id} className="px-6 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink-900">
                          {t.table?.label ?? t.label ?? "Πάγκος"}
                        </p>
                        <p className="text-xs text-ink-500">
                          {t.closedAt && date(t.closedAt)}
                        </p>
                      </div>
                      <Badge tone="success">{money(t.total)}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function NewTableTabForm({
  tableId,
  label,
  seats,
}: {
  tableId: string;
  label: string;
  seats: number;
}) {
  return (
    <form
      action={async (fd: FormData) => {
        "use server";
        const { openTabAction } = await import("./actions");
        const res = await openTabAction(fd);
        if (res.ok) {
          const { redirect } = await import("next/navigation");
          redirect(`/app/pos/${res.id}`);
        }
      }}
    >
      <input type="hidden" name="tableId" value={tableId} />
      <input type="hidden" name="label" value={label} />
      <button
        type="submit"
        className="w-full rounded-2xl border-2 border-dashed border-ink-300 bg-white p-4 text-left transition-colors hover:border-brand-700 hover:bg-brand-50"
      >
        <p className="text-lg font-bold text-brand-900">{label}</p>
        <p className="text-xs text-ink-700">{seats} θέσεις</p>
        <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-700">
          <Plus size={12} aria-hidden /> Άνοιγμα λογαριασμού
        </p>
      </button>
    </form>
  );
}
