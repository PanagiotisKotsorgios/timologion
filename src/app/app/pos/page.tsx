import Link from "next/link";
import {
  UtensilsCrossed,
  Plus,
  ShoppingCart,
  Clock3,
  TrendingUp,
  Receipt,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
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

/** Human-friendly "ago" string in Greek. Prevents a 2-hour-old tab from
    reading as an ancient timestamp. */
function timeAgo(from: Date, to: Date = new Date()): string {
  const secs = Math.floor((to.getTime() - from.getTime()) / 1000);
  if (secs < 60) return `${secs}″`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}′`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (hours < 24) return rest > 0 ? `${hours}ω ${rest}′` : `${hours}ω`;
  const days = Math.floor(hours / 24);
  return `${days}η`;
}

export default async function PosPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [tables, openTabs, recentClosed, todayAgg] = await Promise.all([
    prisma.posTable.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { label: "asc" },
      include: {
        tabs: {
          where: { status: "open" },
          select: { id: true, total: true, openedAt: true, label: true },
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
      take: 6,
      include: { table: { select: { label: true } } },
    }),
    prisma.posTab.aggregate({
      where: {
        businessId: ctx.businessId,
        status: "closed",
        closedAt: { gte: todayStart },
      },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  const counterTabs = openTabs.filter((t) => !t.tableId);
  const openTablesCount = openTabs.length - counterTabs.length;
  const todayRevenue = Number(todayAgg._sum.total ?? 0);
  const todayCount = todayAgg._count;
  const avgTab = todayCount > 0 ? todayRevenue / todayCount : 0;

  return (
    <>
      <PageHeader
        title="POS — Γρήγορη Πώληση"
        subtitle="Ανοιχτοί λογαριασμοί, τραπέζια εστιατορίου και γρήγορη πώληση πάγκου."
        actions={<NewTabButton />}
      />

      {/* KPI strip — matches the aesthetic used on Πληρωμές / Dashboard. */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          icon={<TrendingUp size={20} />}
          label="Έσοδα σήμερα"
          value={money(todayRevenue)}
          hint={`${todayCount} ${todayCount === 1 ? "λογαριασμός" : "λογαριασμοί"} κλεισμένοι`}
          tone="emerald"
        />
        <KpiTile
          icon={<ShoppingCart size={20} />}
          label="Λογαριασμοί πάγκου"
          value={String(counterTabs.length)}
          hint="ανοιχτοί τώρα"
          tone="brand"
        />
        <KpiTile
          icon={<UtensilsCrossed size={20} />}
          label="Τραπέζια σε χρήση"
          value={`${openTablesCount} / ${tables.length}`}
          hint="κατειλημμένα"
          tone="amber"
        />
        <KpiTile
          icon={<Receipt size={20} />}
          label="Μέση αξία σήμερα"
          value={money(avgTab)}
          hint={
            todayCount > 0
              ? `ανά κλεισμένο λογαριασμό`
              : "κανείς κλεισμένος ακόμη"
          }
          tone="brand"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <Card>
            <CardHeader
              title="Τραπέζια"
              subtitle="Κάνε κλικ σε κατειλημμένο τραπέζι για συνέχιση, ή σε άδειο για άνοιγμα νέου."
              action={<TableManager />}
            />
            <CardBody>
              {tables.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-ink-300 bg-ink-50/40 p-6 text-center">
                  <UtensilsCrossed
                    size={28}
                    className="mx-auto text-ink-500"
                    aria-hidden
                  />
                  <p className="mt-3 text-sm text-ink-700">
                    Δεν έχεις τραπέζια ακόμη.
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    Τα καταστήματα χωρίς service μπορούν να αγνοήσουν αυτή την
                    ενότητα και να ανοίγουν λογαριασμό πάγκου από πάνω δεξιά.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {tables.map((t) => {
                    const activeTab = t.tabs[0];
                    return activeTab ? (
                      <OccupiedTableCard
                        key={t.id}
                        href={`/app/pos/${activeTab.id}`}
                        label={t.label}
                        seats={t.seats}
                        total={Number(activeTab.total)}
                        openedAt={activeTab.openedAt}
                      />
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
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={`Ανοιχτοί λογαριασμοί πάγκου (${counterTabs.length})`}
              subtitle="Γρήγορη πώληση χωρίς τραπέζι."
              action={<ShoppingCart size={16} className="text-ink-500" />}
            />
            <CardBody className="p-0">
              {counterTabs.length === 0 ? (
                <div className="p-6 text-center">
                  <ShoppingCart
                    size={24}
                    className="mx-auto text-ink-400"
                    aria-hidden
                  />
                  <p className="mt-2 text-sm text-ink-500">
                    Δεν υπάρχουν ανοιχτοί λογαριασμοί πάγκου.
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    Πάτα «Νέος λογαριασμός» πάνω δεξιά για να ξεκινήσεις μια
                    γρήγορη πώληση.
                  </p>
                </div>
              ) : (
                <ul className="divide-y-2 divide-ink-200">
                  {counterTabs.map((tab) => {
                    const total = Number(tab.total);
                    return (
                      <li key={tab.id}>
                        <Link
                          href={`/app/pos/${tab.id}`}
                          className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-brand-50/60"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold text-brand-900">
                              {tab.label ??
                                `Λογαριασμός #${tab.id.slice(-6)}`}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                              <Clock3 size={11} aria-hidden />
                              Ανοιχτός {timeAgo(tab.openedAt)} · {date(tab.openedAt)}
                            </p>
                          </div>
                          <p className="text-lg font-extrabold text-brand-900 tabular-nums">
                            {money(total)}
                          </p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="xl:sticky xl:top-4 xl:h-fit">
          <CardHeader
            title="Πρόσφατα κλεισμένα"
            subtitle="Οι τελευταίες 6 συναλλαγές."
            action={<CheckCircle2 size={16} className="text-emerald-600" />}
          />
          <CardBody className="p-0">
            {recentClosed.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle2
                  size={24}
                  className="mx-auto text-ink-400"
                  aria-hidden
                />
                <p className="mt-2 text-sm text-ink-500">
                  Καμία κλείσιμη ακόμη.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-ink-200">
                {recentClosed.map((t) => {
                  const receiptHref = `/app/pos/${t.id}/receipt`;
                  return (
                    <li key={t.id}>
                      <Link
                        href={receiptHref}
                        className="flex items-start justify-between gap-3 px-5 py-3 transition-colors hover:bg-brand-50/60"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ink-900">
                            {t.table?.label ?? t.label ?? "Πάγκος"}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                            <Clock3 size={11} aria-hidden />
                            {t.closedAt ? timeAgo(t.closedAt) : "—"} πριν
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge tone="success">{money(t.total)}</Badge>
                          <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-brand-800">
                            Απόδειξη
                            <ExternalLink size={9} aria-hidden />
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function KpiTile({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "brand" | "emerald" | "amber";
}) {
  const tones = {
    brand: {
      iconBg: "bg-brand-100 text-brand-800",
      value: "text-brand-900",
    },
    emerald: {
      iconBg: "bg-emerald-100 text-emerald-800",
      value: "text-emerald-800",
    },
    amber: {
      iconBg: "bg-amber-100 text-amber-800",
      value: "text-amber-900",
    },
  }[tone];
  return (
    <Card>
      <CardBody className="!p-3 sm:!p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500 sm:text-[11px]">
              {label}
            </p>
            <p
              className={`mt-2 font-extrabold leading-none tabular-nums ${tones.value}`}
              style={{ fontSize: "clamp(1.25rem, 3vw, 1.875rem)" }}
            >
              {value}
            </p>
            <p className="mt-1 truncate text-xs text-ink-700 sm:text-sm">
              {hint}
            </p>
          </div>
          <div
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl sm:h-10 sm:w-10 sm:rounded-2xl ${tones.iconBg}`}
          >
            {icon}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function OccupiedTableCard({
  href,
  label,
  seats,
  total,
  openedAt,
}: {
  href: string;
  label: string;
  seats: number;
  total: number;
  openedAt: Date;
}) {
  const ago = timeAgo(openedAt);
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm">
        <Clock3 size={9} aria-hidden />
        {ago}
      </span>
      <p className="text-lg font-extrabold text-brand-900">{label}</p>
      <p className="text-[11px] text-ink-700">{seats} θέσεις</p>
      <p className="mt-3 text-lg font-black text-amber-900 tabular-nums">
        {money(total)}
      </p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-800">
        Ανοιχτό · πάτα για συνέχεια →
      </p>
    </Link>
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
        className="group flex w-full flex-col rounded-2xl border-2 border-dashed border-ink-300 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-md"
      >
        <p className="text-lg font-extrabold text-brand-900">{label}</p>
        <p className="text-[11px] text-ink-700">{seats} θέσεις</p>
        <p className="mt-3 flex items-center gap-1 text-xs font-black uppercase tracking-widest text-emerald-700 group-hover:text-emerald-800">
          <Plus size={12} strokeWidth={3} aria-hidden /> Άνοιγμα λογαριασμού
        </p>
      </button>
    </form>
  );
}
