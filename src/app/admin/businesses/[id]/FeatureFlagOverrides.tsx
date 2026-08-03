import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { setBusinessFlagOverrideAction } from "./support-actions";

type FlagRow = {
  key: string;
  description: string | null;
  rollout: "none" | "beta" | "all";
  override: boolean | null;
};

/**
 * Per-business feature-flag control. Each flag is a row with three
 * radio-style buttons (inherit | force on | force off). "Inherit"
 * clears the override so the tenant follows the global rollout.
 */
export function FeatureFlagOverrides({
  businessId,
  flags,
}: {
  businessId: string;
  flags: FlagRow[];
}) {
  if (flags.length === 0) {
    return (
      <Card>
        <CardHeader
          title="Feature flags"
          subtitle="Δεν έχουν οριστεί flags στην πλατφόρμα."
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Feature flags"
        subtitle="Per-business overrides υπερτερούν του global rollout."
      />
      <CardBody className="p-0">
        <ul className="divide-y divide-ink-200">
          {flags.map((f) => {
            const effective =
              f.override !== null ? f.override : f.rollout === "all";
            return (
              <li key={f.key} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-black text-brand-900">
                      {f.key}
                    </p>
                    {f.description && (
                      <p className="mt-0.5 text-xs text-ink-700">
                        {f.description}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge
                        tone={
                          f.rollout === "all"
                            ? "success"
                            : f.rollout === "beta"
                              ? "warning"
                              : "muted"
                        }
                      >
                        rollout: {f.rollout}
                      </Badge>
                      <Badge tone={effective ? "success" : "muted"}>
                        {effective ? "ενεργό εδώ" : "ανενεργό εδώ"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1">
                  <OverrideButton
                    businessId={businessId}
                    flagKey={f.key}
                    label="Inherit"
                    state="clear"
                    active={f.override === null}
                  />
                  <OverrideButton
                    businessId={businessId}
                    flagKey={f.key}
                    label="Force ON"
                    state="on"
                    active={f.override === true}
                    tone="success"
                  />
                  <OverrideButton
                    businessId={businessId}
                    flagKey={f.key}
                    label="Force OFF"
                    state="off"
                    active={f.override === false}
                    tone="danger"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}

function OverrideButton({
  businessId,
  flagKey,
  label,
  state,
  active,
  tone,
}: {
  businessId: string;
  flagKey: string;
  label: string;
  state: "clear" | "on" | "off";
  active: boolean;
  tone?: "success" | "danger";
}) {
  const activeCls =
    tone === "success"
      ? "border-emerald-700 bg-emerald-600 text-white"
      : tone === "danger"
        ? "border-red-700 bg-red-600 text-white"
        : "border-brand-800 bg-brand-700 text-white";
  return (
    <form action={setBusinessFlagOverrideAction}>
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="flagKey" value={flagKey} />
      <input type="hidden" name="state" value={state} />
      <button
        type="submit"
        className={
          "h-8 w-full rounded-md border-2 text-[11px] font-bold " +
          (active
            ? activeCls
            : "border-ink-300 bg-white text-ink-800 hover:border-ink-500")
        }
      >
        {label}
      </button>
    </form>
  );
}
