import { Sparkles, Calendar } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { money, date } from "@/lib/format";
import { checkDocumentQuota } from "@/lib/quota";
import { ChangePlanForm } from "./ChangePlanForm";
import { CancelButton } from "./CancelButton";
import { findTierByName, B2G_ADDON_INCL_VAT, formatEur } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function SubscriptionSettingsPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");

  const [subscription, plans] = await Promise.all([
    prisma.businessSubscription.findFirst({
      where: {
        businessId: ctx.businessId,
        status: { in: ["active", "trialing", "past_due"] },
      },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.platformPlan.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { priceMonthly: "asc" }],
    }),
  ]);

  // Wrapp offers annual-only, so all active subscriptions are yearly. We
  // still respect `priceOverride` for grandfathered custom pricing.
  const activePrice =
    subscription?.priceOverride != null
      ? Number(subscription.priceOverride)
      : Number(subscription?.plan.priceYearly ?? 0);

  const quota = await checkDocumentQuota(ctx.businessId);
  const quotaUsed = quota.ok ? quota.used : quota.used;
  const quotaLimit = quota.ok ? quota.limit : quota.limit;
  const quotaPct =
    quotaLimit && quotaLimit > 0
      ? Math.min(100, Math.round((quotaUsed / quotaLimit) * 100))
      : 0;

  return (
    <>
      <PageHeader
        title="Συνδρομή"
        subtitle="Δες το πακέτο σου, αλλαγή πακέτου ή κατάργηση συνδρομής."
      />

      {!subscription ? (
        <Alert tone="warning" title="Δεν υπάρχει ενεργή συνδρομή">
          Επίλεξε πακέτο για να ενεργοποιήσεις τη συνδρομή σου.
        </Alert>
      ) : (
        <Card className="mb-6 overflow-hidden">
          <div className="bg-brand-900 px-6 py-5 text-white sm:px-8 sm:py-6">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-brand-200">
                  Ενεργό πακέτο
                </p>
                <p className="mt-2 text-2xl font-extrabold sm:text-3xl md:text-4xl">
                  {subscription.plan.name}
                </p>
                {subscription.plan.description && (
                  <p className="mt-1 text-sm text-brand-100">
                    {subscription.plan.description}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold sm:text-4xl">
                  {money(activePrice)}
                </p>
                <p className="mt-1 text-sm text-brand-200">
                  / έτος (συμπ. ΦΠΑ)
                </p>
              </div>
            </div>

            {/* Plan details from the shared catalog — features, quotas,
                B2G add-on. Deliberately does NOT show the partner/markup
                breakdown; the price above is the total the user pays. */}
            {(() => {
              const tier = findTierByName(subscription.plan.name);
              if (!tier) return null;
              return (
                <div className="mt-4 grid gap-2 rounded-xl border border-white/15 bg-white/5 p-3 text-[12px] text-white/85 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
                      Παραστατικά
                    </p>
                    <p className="mt-0.5 text-sm font-bold">
                      {tier.docsPerYear.toLocaleString("el-GR")} / έτος
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
                      API calls
                    </p>
                    <p className="mt-0.5 text-sm font-bold">
                      {tier.apiCallsPerYear.toLocaleString("el-GR")} / έτος
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
          <CardBody className="space-y-4">
            <Row
              label={
                <span className="inline-flex items-center gap-2">
                  <Calendar size={14} aria-hidden /> Επόμενη χρέωση
                </span>
              }
              value={
                subscription.nextBillingAt
                  ? date(subscription.nextBillingAt)
                  : "—"
              }
            />
            <Row
              label={
                <span className="inline-flex items-center gap-2">
                  <Sparkles size={14} aria-hidden /> Τρέχουσα περίοδος
                </span>
              }
              value={`${date(subscription.currentPeriodStart)} → ${date(subscription.currentPeriodEnd)}`}
            />
            <Row
              label="Κατάσταση"
              value={<Badge tone="success">Ενεργή</Badge>}
            />

            <div className="border-t border-ink-200 pt-4">
              <p className="text-[11px] font-black uppercase tracking-widest text-ink-500">
                Χρήση περιόδου · Παραστατικά
              </p>
              {quotaLimit && quotaLimit > 0 ? (
                <>
                  <div className="mt-2 flex items-baseline justify-between gap-3">
                    <p className="text-2xl font-extrabold text-brand-900">
                      {quotaUsed} / {quotaLimit}
                    </p>
                    <p
                      className={
                        "text-sm font-semibold " +
                        (quotaPct >= 90 ? "text-red-700" : "text-ink-700")
                      }
                    >
                      {quotaPct}%
                    </p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-200">
                    <div
                      className={
                        "h-full transition-all " +
                        (quotaPct >= 90
                          ? "bg-red-600"
                          : quotaPct >= 70
                            ? "bg-amber-500"
                            : "bg-brand-700")
                      }
                      style={{ width: `${quotaPct}%` }}
                    />
                  </div>
                  {quotaPct >= 90 && (
                    <p className="mt-2 text-xs text-red-700">
                      Πλησιάζεις το όριο. Σκέψου αναβάθμιση πακέτου.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-xl font-extrabold text-brand-900">
                  Απεριόριστα
                </p>
              )}
            </div>

            {/* Feature bullets from the shared catalog. */}
            {(() => {
              const tier = findTierByName(subscription.plan.name);
              if (!tier) return null;
              return (
                <div className="border-t border-ink-200 pt-4">
                  <p className="text-[11px] font-black uppercase tracking-widest text-ink-500">
                    Τι περιλαμβάνει το πακέτο
                  </p>
                  <ul className="mt-3 grid gap-1.5 text-sm text-ink-900 sm:grid-cols-2">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span
                          aria-hidden
                          className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"
                        >
                          ✓
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 rounded-lg border-2 border-dashed border-brand-200 bg-brand-50/60 px-3 py-2 text-xs text-brand-900">
                    <strong>B2G add-on (προαιρετικά):</strong> Για έκδοση
                    παραστατικών προς το δημόσιο μπορείς να προσθέσεις +
                    {formatEur(B2G_ADDON_INCL_VAT)}/έτος σε οποιοδήποτε
                    πακέτο. Επικοινώνησε μαζί μας για ενεργοποίηση.
                  </p>
                </div>
              );
            })()}

            <div className="flex justify-end pt-2">
              <CancelButton />
            </div>
          </CardBody>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader
          title="Αλλαγή πακέτου"
          subtitle="Επίλεξε νέο πακέτο ή κύκλο χρέωσης."
        />
        <CardBody>
          <ChangePlanForm
            plans={plans.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              priceMonthly: p.priceMonthly.toString(),
              priceYearly: p.priceYearly.toString(),
              features: p.features
                ? p.features
                    .split("\n")
                    .map((f) => f.trim())
                    .filter(Boolean)
                : [],
            }))}
            currentPlanId={subscription?.planId ?? null}
            currentCycle={subscription?.billingCycle ?? null}
          />
        </CardBody>
      </Card>

    </>
  );
}

function Row({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-ink-300/60 pb-3 last:border-b-0 last:pb-0 text-base">
      <span className="text-ink-700">{label}</span>
      <span className="font-semibold text-ink-900">{value}</span>
    </div>
  );
}
