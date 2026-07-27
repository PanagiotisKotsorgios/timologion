import Link from "next/link";
import {
  ShoppingCart,
  Users2,
  FileSpreadsheet,
  CalendarClock,
  Sparkles,
  Check,
  ArrowRight,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { requireTenant } from "@/lib/tenant";
import {
  PLUGIN_CATALOG,
  getPluginRuntime,
  type PluginDefinition,
  type PluginRuntimeStatus,
} from "@/lib/plugins";
import { ActivatePluginButton } from "./ActivatePluginButton";
import { PluginToggle } from "./PluginToggle";
import { AutoDismissAlert } from "./AutoDismissAlert";

export const dynamic = "force-dynamic";

const ICONS: Record<string, LucideIcon> = {
  ShoppingCart,
  Users2,
  FileSpreadsheet,
  CalendarClock,
  Sparkles,
};

export default async function PluginsPage({
  searchParams,
}: {
  searchParams: Promise<{ activated?: string; deactivated?: string }>;
}) {
  const ctx = await requireTenant();
  const [runtime, params] = await Promise.all([
    getPluginRuntime(ctx.businessId),
    searchParams,
  ]);

  const justActivated =
    params.activated &&
    PLUGIN_CATALOG.find((p) => p.code === params.activated);
  const justDeactivated =
    params.deactivated &&
    PLUGIN_CATALOG.find((p) => p.code === params.deactivated);

  return (
    <>
      <PageHeader
        title="Πρόσθετα"
        subtitle="Ενεργοποίησέ τα δωρεάν για 1 έτος. Στη λήξη επιλέγεις αν θα τα κρατήσεις."
      />

      {justActivated && (
        <AutoDismissAlert
          title={`Ενεργοποιήθηκε: ${justActivated.name}`}
          body="Δωρεάν για 1 έτος — θα βρεις τη νέα καρτέλα στο πλαϊνό μενού."
        />
      )}
      {justDeactivated && (
        <AutoDismissAlert
          tone="muted"
          title={`Απενεργοποιήθηκε: ${justDeactivated.name}`}
          body="Μπορείς να το ενεργοποιήσεις ξανά όποτε το χρειαστείς."
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PLUGIN_CATALOG.map((p) => {
          const rt = runtime.get(p.code)!;
          return <PluginCard key={p.code} plugin={p} runtime={rt} />;
        })}
      </div>
    </>
  );
}

function PluginCard({
  plugin,
  runtime,
}: {
  plugin: PluginDefinition;
  runtime: PluginRuntimeStatus;
}) {
  const Icon = ICONS[plugin.iconName] ?? Sparkles;
  const disabled = plugin.availability === "coming_soon";
  const isTrialing = runtime.status === "trialing";
  const isActive = runtime.status === "active";
  const isExpired = runtime.status === "expired";
  const isActivated = isTrialing || isActive;

  return (
    <Card
      className={
        "flex h-full flex-col overflow-hidden transition-shadow hover:shadow-soft " +
        (disabled ? "opacity-70" : "")
      }
    >
      <div className="flex items-start justify-between px-6 pt-6">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-800">
          <Icon size={22} aria-hidden />
        </div>
        <div className="flex items-center gap-2">
          <StatusPill
            runtime={runtime}
            availability={plugin.availability}
          />
          {isActivated && (
            <PluginToggle
              code={plugin.code}
              pluginName={plugin.name}
              isOn
            />
          )}
        </div>
      </div>
      <CardBody className="flex flex-1 flex-col">
        <h3 className="text-xl font-extrabold text-brand-900">{plugin.name}</h3>
        <p className="mt-2 text-sm text-ink-700">{plugin.tagline}</p>

        <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-900">
          {plugin.perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2">
              <Check
                size={16}
                strokeWidth={2.5}
                className="mt-0.5 shrink-0 text-emerald-600"
                aria-hidden
              />
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        {isTrialing && runtime.daysLeftInTrial != null && (
          <div className="mt-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
            Δωρεάν δοκιμή — απομένουν{" "}
            <strong>{runtime.daysLeftInTrial}</strong> μέρες.
          </div>
        )}
        {isExpired && (
          <div className="mt-4 rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
            Η δωρεάν δοκιμή έληξε. Ενεργοποίησε συνδρομή για να συνεχίσεις.
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-lg font-extrabold text-emerald-700">
            Δωρεάν
          </p>
          {disabled ? (
            <span className="text-sm font-semibold text-ink-500">—</span>
          ) : isActivated ? (
            <Link
              href={plugin.href}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-900 px-5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 hover:bg-black"
            >
              Άνοιγμα
              <ArrowRight size={14} aria-hidden />
            </Link>
          ) : isExpired ? (
            <ActivatePluginButton
              code={plugin.code}
              pluginName={plugin.name}
              priceMonthly={plugin.priceMonthly}
              variant="danger"
              label="Ανανέωση"
            />
          ) : (
            <ActivatePluginButton
              code={plugin.code}
              pluginName={plugin.name}
              priceMonthly={plugin.priceMonthly}
            />
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function StatusPill({
  runtime,
  availability,
}: {
  runtime: PluginRuntimeStatus;
  availability: PluginDefinition["availability"];
}) {
  if (availability === "coming_soon") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-ink-200 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-ink-700">
        Έρχεται
      </span>
    );
  }
  if (runtime.status === "trialing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-900">
        <Clock size={10} />
        Δωρεάν δοκιμή
      </span>
    );
  }
  if (runtime.status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-brand-900">
        Ενεργό
      </span>
    );
  }
  if (runtime.status === "expired") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-red-800">
        Έληξε
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-ink-700">
      Πρόσθετο
    </span>
  );
}
