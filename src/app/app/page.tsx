import Link from "next/link";
import {
  FileText,
  Receipt,
  UserPlus,
  PackagePlus,
  Check,
  Rocket,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { t } from "@/lib/i18n";
import { money, date } from "@/lib/format";
import { checkDocumentQuota } from "@/lib/quota";
import { ClickableRow } from "./ClickableRow";

export default async function DashboardPage() {
  const ctx = await requireTenant();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    wrapp,
    monthCount,
    totalIssuedCount,
    todayCount,
    recentDocs,
    draftCount,
    unpaidAgg,
    clientCount,
    itemCount,
    quota,
  ] = await Promise.all([
    prisma.wrappConnection.findUnique({
      where: { businessId: ctx.businessId },
      select: { status: true, canIssueInvoice: true },
    }),
    prisma.document.count({
      where: {
        businessId: ctx.businessId,
        issueDate: { gte: monthStart },
        status: { in: ["issued", "sending"] },
      },
    }),
    prisma.document.count({
      where: {
        businessId: ctx.businessId,
        status: { in: ["issued", "sending"] },
      },
    }),
    prisma.document.count({
      where: {
        businessId: ctx.businessId,
        issueDate: { gte: dayStart },
        status: { in: ["issued", "sending"] },
      },
    }),
    prisma.document.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: { select: { legalName: true } } },
    }),
    prisma.document.count({
      where: { businessId: ctx.businessId, status: "draft" },
    }),
    prisma.document.aggregate({
      where: {
        businessId: ctx.businessId,
        status: "issued",
        paymentStatus: { in: ["unpaid", "partial"] },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.client.count({ where: { businessId: ctx.businessId } }),
    prisma.item.count({ where: { businessId: ctx.businessId } }),
    checkDocumentQuota(ctx.businessId),
  ]);

  // Active subscription — powers the plan-usage strip under the stat cards.
  const activeSub = await prisma.businessSubscription
    .findFirst({
      where: {
        businessId: ctx.businessId,
        status: { in: ["active", "trialing", "past_due"] },
      },
      include: { plan: { select: { name: true, includedDocsMonth: true } } },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => null);

  const wrappStatus = wrapp?.status ?? "inactive";


  // Onboarding checklist stays visible until every step is actually done —
  // account created (implicit), provider active, first client, first item,
  // first issued document. Only after all four remaining boxes tick does it
  // disappear from the dashboard. Uses the all-time issued count so it
  // doesn't come back at month rollover.
  const onboardingSteps = {
    wrapp: wrappStatus === "active",
    clients: clientCount > 0,
    items: itemCount > 0,
    issued: totalIssuedCount > 0,
  };
  const showOnboarding = Object.values(onboardingSteps).some((v) => !v);

  const quotaLimit = quota.ok ? quota.limit : quota.limit;
  const quotaUsed = quota.ok ? quota.used : quota.used;

  return (
    <>
      <PageHeader
        title={`Καλωσόρισες, ${ctx.businessName}`}
        subtitle="Ξεκίνα με μια γρήγορη ενέργεια παρακάτω."
        actions={
          <>
            <LinkButton
              href="/app/documents/new?type=invoice"
              icon={FileText}
            >
              Νέο Τιμολόγιο
            </LinkButton>
            <LinkButton
              href="/app/documents/new?type=retail_receipt"
              variant="secondary"
              icon={Receipt}
            >
              Νέα Απόδειξη
            </LinkButton>
            <LinkButton href="/app/clients/new" variant="secondary" icon={UserPlus}>
              Νέος Πελάτης
            </LinkButton>
            <LinkButton
              href="/app/items/new"
              variant="secondary"
              icon={PackagePlus}
            >
              Νέα Υπηρεσία
            </LinkButton>
          </>
        }
      />

      {/* Activation warning is handled by the blocking ActivationGate modal in
          the app layout — no in-page banner needed here. */}

      {showOnboarding && (
        <div className="mb-6">
          <WelcomeChecklist
            hasClients={onboardingSteps.clients}
            hasItems={onboardingSteps.items}
            hasIssuedDoc={onboardingSteps.issued}
            wrappActive={onboardingSteps.wrapp}
          />
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        <StatCard
          eyebrow="Σήμερα"
          value={String(todayCount)}
          label={todayCount === 1 ? "παραστατικό εκδόθηκε" : "παραστατικά εκδόθηκαν"}
          accent="brand"
        />
        <StatCard
          eyebrow="Αυτόν τον μήνα"
          value={String(monthCount)}
          label={
            quotaLimit && quotaLimit > 0
              ? `από ${quotaLimit.toLocaleString("el-GR")} του πακέτου`
              : "εκδόσεις χωρίς όριο"
          }
          accent="emerald"
          progress={
            quotaLimit && quotaLimit > 0
              ? Math.min(100, Math.round((quotaUsed / quotaLimit) * 100))
              : null
          }
        />
        <StatCard
          eyebrow="Ανεξόφλητα"
          value={money(unpaidAgg._sum.totalAmount ?? 0)}
          label={`σε ${unpaidAgg._count ?? 0} ${(unpaidAgg._count ?? 0) === 1 ? "παραστατικό" : "παραστατικά"}`}
          accent="amber"
        />
      </div>

      <PlanUsageStrip
        planName={activeSub?.plan.name ?? null}
        cap={activeSub?.plan.includedDocsMonth ?? null}
        used={totalIssuedCount}
      />

      <div className="mt-6 grid gap-6 md:grid-cols-4">
        <div className="md:col-span-3">
          <Card>
            <CardHeader
              title="Πρόσφατα παραστατικά"
              action={
                <LinkButton
                  href="/app/documents"
                  variant="ghost"
                  size="sm"
                >
                  Όλα
                </LinkButton>
              }
            />
            <CardBody className="p-0">
              {recentDocs.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="Δεν υπάρχουν παραστατικά ακόμα."
                    description="Ξεκίνα με ένα πρόχειρο τιμολόγιο."
                    action={
                      <LinkButton href="/app/documents/new">
                        Νέο Παραστατικό
                      </LinkButton>
                    }
                  />
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ημ/νία</th>
                      <th>Πελάτης</th>
                      <th>Τύπος</th>
                      <th className="text-right">Σύνολο</th>
                      <th>Κατάσταση</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentDocs.map((d) => (
                      <ClickableRow key={d.id}>
                        <td className="mono">
                          <Link
                            href={`/app/documents/${d.id}`}
                            data-row-anchor
                            className="font-semibold text-brand-800 hover:text-brand-900"
                          >
                            {date(d.issueDate)}
                          </Link>
                        </td>
                        <td>{d.client?.legalName ?? "—"}</td>
                        <td>{t.documents.types[d.type]}</td>
                        <td className="text-right font-semibold">
                          {money(d.totalAmount)}
                        </td>
                        <td>
                          <DocStatusBadge status={d.status} />
                        </td>
                      </ClickableRow>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardBody className="p-6 md:p-7">
            <p className="text-[11px] font-black uppercase tracking-widest text-ink-500">
              Πρόχειρα
            </p>
            <p className="mt-3 text-5xl font-extrabold leading-none tracking-tightest text-ink-900 md:text-6xl">
              {draftCount}
            </p>
            <p className="mt-2 text-sm font-medium text-ink-700 md:text-base">
              ανοιχτά προς επεξεργασία
            </p>
            <LinkButton
              href="/app/documents?status=draft"
              variant="secondary"
              size="md"
              className="mt-5 border-2 border-ink-900 text-ink-900 hover:bg-ink-900 hover:text-white"
            >
              Άνοιξε τα πρόχειρα →
            </LinkButton>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function WelcomeChecklist({
  hasClients,
  hasItems,
  hasIssuedDoc,
  wrappActive,
}: {
  hasClients: boolean;
  hasItems: boolean;
  hasIssuedDoc: boolean;
  wrappActive: boolean;
}) {
  const steps = [
    {
      done: true,
      title: "Δημιούργησες τον λογαριασμό σου",
      desc: "Ο λογαριασμός είναι έτοιμος.",
      href: null,
      cta: null,
    },
    {
      done: wrappActive,
      title: "Ενεργοποίηση ηλεκτρονικής έκδοσης",
      desc: "Σύνδεση με τον πάροχο για να εκδίδεις παραστατικά με MARK/UID/QR.",
      href: "/app/settings/wrapp",
      cta: "Ενεργοποίηση",
    },
    {
      done: hasClients,
      title: "Πρόσθεσε τον πρώτο σου πελάτη",
      desc: "Καταχώρησε πελάτη με ΑΦΜ ή αναζήτησε αυτόματα.",
      href: "/app/clients/new",
      cta: "Νέος πελάτης",
    },
    {
      done: hasItems,
      title: "Πρόσθεσε προϊόντα ή υπηρεσίες",
      desc: "Δημιούργησε τον κατάλογο ειδών σου με τιμές και ΦΠΑ.",
      href: "/app/items/new",
      cta: "Νέο είδος",
    },
    {
      done: hasIssuedDoc,
      title: "Εξέδωσε το πρώτο σου παραστατικό",
      desc: "Δημιούργησε τιμολόγιο ή απόδειξη σε τρία κλικ.",
      href: "/app/documents/new?type=invoice",
      cta: "Νέο παραστατικό",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done);
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <Card className="overflow-hidden">
      <div className="relative border-b-2 border-ink-200 bg-brand-900 px-6 py-6 text-white md:px-8 md:py-8">
        <div className="flex items-start gap-4">
          <span className="mt-1 shrink-0 rounded-2xl bg-white/10 p-3 text-white">
            <Rocket size={22} aria-hidden />
          </span>
          <div className="flex-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-brand-200">
              Ξεκίνησες τώρα
            </p>
            <h2 className="mt-1 text-2xl font-extrabold md:text-3xl">
              5 βήματα για να στείλεις το πρώτο σου παραστατικό
            </h2>
            <p className="mt-1 text-sm text-brand-100">
              {completed} από {steps.length} ολοκληρώθηκαν · {pct}%
            </p>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full bg-white transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <CardBody className="p-0">
        <ol className="divide-y-2 divide-ink-200">
          {steps.map((s, i) => {
            const isNext = s === nextStep;
            return (
              <li
                key={i}
                className={
                  "flex items-start gap-4 px-6 py-4 md:px-8 md:py-5 " +
                  (isNext ? "bg-brand-50" : "")
                }
              >
                <span
                  className={
                    "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold " +
                    (s.done
                      ? "bg-emerald-100 text-emerald-800"
                      : isNext
                        ? "bg-brand-900 text-white"
                        : "bg-ink-200 text-ink-700")
                  }
                >
                  {s.done ? <Check size={16} /> : i + 1}
                </span>
                <div className="flex-1">
                  <p
                    className={
                      "text-base font-bold " +
                      (s.done ? "text-ink-500 line-through" : "text-brand-900")
                    }
                  >
                    {s.title}
                  </p>
                  {!s.done && (
                    <p className="mt-0.5 text-sm text-ink-700">{s.desc}</p>
                  )}
                </div>
                {!s.done && s.href && s.cta && (
                  <LinkButton
                    href={s.href}
                    size="sm"
                    variant={isNext ? "primary" : "secondary"}
                    icon={isNext ? Sparkles : undefined}
                  >
                    {s.cta}
                  </LinkButton>
                )}
              </li>
            );
          })}
        </ol>
      </CardBody>
    </Card>
  );
}

const ACCENT_TOKENS: Record<
  "brand" | "emerald" | "amber",
  {
    label: string;
    hex: string;
    tileBg: string;
    tileText: string;
  }
> = {
  brand: {
    label: "brand-900",
    hex: "#0B1B3A",
    tileBg: "bg-brand-50",
    tileText: "text-brand-900",
  },
  emerald: {
    label: "emerald-700",
    hex: "#047857",
    tileBg: "bg-emerald-50",
    tileText: "text-emerald-900",
  },
  amber: {
    label: "amber-700",
    hex: "#B45309",
    tileBg: "bg-amber-50",
    tileText: "text-amber-900",
  },
};

function StatCard({
  eyebrow,
  value,
  label,
  accent,
  progress,
}: {
  eyebrow: string;
  value: string;
  label: string;
  accent: "brand" | "emerald" | "amber";
  progress?: number | null;
}) {
  const tokens = ACCENT_TOKENS[accent];
  return (
    <Card className="overflow-hidden">
      <CardBody className="p-6 md:p-8">
        <p
          className={
            "text-[12px] font-black uppercase tracking-widest " + tokens.tileText
          }
        >
          {eyebrow}
        </p>
        <div className="mt-4 flex items-end gap-3">
          <p className="text-5xl font-extrabold leading-none tracking-tightest text-ink-900 md:text-6xl">
            {value}
          </p>
        </div>
        <p className="mt-3 text-base font-medium text-ink-700 md:text-lg">
          {label}
        </p>

        {progress != null && (
          <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-ink-200">
            <div
              className="h-full transition-all"
              style={{
                width: `${progress}%`,
                backgroundColor:
                  progress >= 90 ? "#DC2626" : progress >= 70 ? "#D97706" : tokens.hex,
              }}
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function PlanUsageStrip({
  planName,
  cap,
  used,
}: {
  planName: string | null;
  cap: number | null;
  used: number;
}) {
  const hasCap = typeof cap === "number" && cap > 0;
  const remaining = hasCap ? Math.max(0, cap! - used) : null;
  const pct = hasCap ? Math.min(100, Math.round((used / cap!) * 100)) : 0;
  const overWarn = hasCap && pct >= 90;
  const nearWarn = hasCap && !overWarn && pct >= 70;

  // No active subscription yet — nudge the user toward the pricing page
  // instead of silently disappearing.
  if (!planName) {
    return (
      <div className="mt-6">
        <Card>
          <CardBody className="p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-brand-900/60">
                  Πακέτο συνδρομής
                </p>
                <p className="mt-1 text-2xl font-extrabold text-brand-900 md:text-3xl">
                  Δεν έχεις επιλέξει πακέτο
                </p>
                <p className="mt-1 text-sm font-semibold text-ink-700">
                  Επίλεξε πακέτο για να δεις χρήση και όρια παραστατικών.
                </p>
              </div>
              <LinkButton href="/app/settings/subscription" variant="secondary">
                Επιλογή πακέτου
              </LinkButton>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <Card>
        <CardBody className="p-5 md:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-widest text-brand-900/60">
                Πακέτο συνδρομής
              </p>
              <p className="mt-1 text-2xl font-extrabold text-brand-900 md:text-3xl">
                {planName}
              </p>
            </div>
            {hasCap ? (
              <div className="text-right">
                <p className="text-[11px] font-black uppercase tracking-widest text-brand-900/60">
                  Παραστατικά
                </p>
                <p className="mt-1 text-2xl font-extrabold text-brand-900 md:text-3xl">
                  {used.toLocaleString("el-GR")}
                  <span className="text-lg font-bold text-ink-500">
                    {" "}
                    / {cap!.toLocaleString("el-GR")}
                  </span>
                </p>
                <p className="mt-1 text-sm font-semibold text-ink-700">
                  Μένουν {remaining!.toLocaleString("el-GR")}
                </p>
              </div>
            ) : (
              <div className="text-right">
                <p className="text-[11px] font-black uppercase tracking-widest text-brand-900/60">
                  Χωρίς όριο
                </p>
                <p className="mt-1 text-2xl font-extrabold text-brand-900">
                  Απεριόριστα
                </p>
              </div>
            )}
          </div>

          {hasCap && (
            <div className="mt-5">
              {/* Track is now h-4 with a stronger border-radius so it reads
                  as a proper progress bar rather than a hairline. When usage
                  is above 0 but rounds to 0% (e.g. 3 / 1500), we force a
                  minimum sliver width so the user can see something happened. */}
              <div className="h-4 w-full overflow-hidden rounded-full bg-ink-200 shadow-inner">
                <div
                  className={
                    "h-full rounded-full transition-all " +
                    (overWarn
                      ? "bg-red-600"
                      : nearWarn
                        ? "bg-amber-500"
                        : "bg-brand-900")
                  }
                  style={{
                    width:
                      used > 0 && pct < 2
                        ? "2%"
                        : `${pct}%`,
                  }}
                  aria-valuenow={pct}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-ink-500">
                {pct}% χρήση
              </p>
              {overWarn && (
                <p className="mt-2 text-sm font-semibold text-red-700">
                  Πλησιάζεις το όριο του πακέτου — σκέψου αναβάθμιση.
                </p>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function DocStatusBadge({ status }: { status: string }) {
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
