import Link from "next/link";
import { Sparkles, Lock } from "lucide-react";
import { requireTenant } from "@/lib/tenant";
import { getPluginRuntime, type PluginCode } from "@/lib/plugins";
import { ActivatePluginButton } from "@/app/app/plugins/ActivatePluginButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

/**
 * Server-side gate for plugin routes. Wraps each plugin's layout so we
 * check activation once per navigation and either:
 *   - Render `<>{children}</>` when the plugin is usable (trialing / paid)
 *   - Render a paywall inline when the trial has expired (never redirect
 *     — the user should see WHY they can't access, not get bounced to a
 *     different URL)
 *   - Render an "activate to unlock" prompt when the plugin was never
 *     activated (e.g. someone deep-linked to /app/pos without going
 *     through the plugins page)
 */
export async function PluginGate({
  code,
  children,
}: {
  code: PluginCode;
  children: React.ReactNode;
}) {
  const ctx = await requireTenant();
  const runtime = await getPluginRuntime(ctx.businessId);
  const state = runtime.get(code);

  if (!state) {
    // Shouldn't happen — the catalog is compile-time complete. Fail open
    // rather than blocking the page.
    return <>{children}</>;
  }

  if (state.usable) return <>{children}</>;

  const def = state.definition;
  const isExpired = state.status === "expired";

  return (
    <>
      <PageHeader
        title={def.name}
        subtitle={
          isExpired
            ? "Η δωρεάν 1-ετής δοκιμή έληξε — ενεργοποίησε συνδρομή για να συνεχίσεις."
            : "Ενεργοποίησέ το δωρεάν για 1 έτος."
        }
      />
      <Card className="overflow-hidden">
        <div className="bg-brand-900 px-8 py-8 text-white">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-widest">
                <Lock size={12} />
                {isExpired ? "Απαιτείται συνδρομή" : "Πρόσθετο"}
              </div>
              <h2 className="text-3xl font-extrabold md:text-4xl">
                {def.name}
              </h2>
              <p className="mt-2 max-w-lg text-brand-100">
                {def.tagline}
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-extrabold text-emerald-300">
                Δωρεάν
              </p>
              {!isExpired && (
                <p className="mt-1 text-sm text-brand-200">
                  για ένα ολόκληρο έτος
                </p>
              )}
            </div>
          </div>
        </div>
        <CardHeader
          title={isExpired ? "Συνέχισε τη χρήση" : "Τι περιλαμβάνει"}
        />
        <CardBody>
          <ul className="mb-6 space-y-2 text-sm text-ink-900">
            {def.perks.map((perk) => (
              <li key={perk} className="flex items-start gap-2">
                <Sparkles
                  size={16}
                  strokeWidth={2.5}
                  className="mt-0.5 shrink-0 text-brand-800"
                  aria-hidden
                />
                <span>{perk}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <ActivatePluginButton
              code={code}
              pluginName={def.name}
              priceMonthly={def.priceMonthly}
              variant={isExpired ? "danger" : "primary"}
              label={isExpired ? "Ανανέωση συνδρομής" : "Ενεργοποίηση"}
            />
            <Link
              href="/app/plugins"
              className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-ink-300 bg-white px-6 text-base font-bold text-ink-900 hover:border-brand-900"
            >
              Πίσω στα πρόσθετα
            </Link>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
