"use client";

import { setFlagRolloutAction } from "./actions";

/**
 * Two inline forms: rollout mode select + percentage slider. Both
 * auto-submit on change. Percentage is only visually meaningful for
 * rollout=all — deterministic hash of (flagKey, businessId) puts each
 * tenant in a stable bucket so `pct=25` means the same 25% every call.
 */
export function FlagRolloutSelect({
  flagKey,
  current,
  currentPct,
}: {
  flagKey: string;
  current: "none" | "beta" | "all";
  currentPct: number;
}) {
  const showPct = current === "all";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={setFlagRolloutAction}>
        <input type="hidden" name="key" value={flagKey} />
        <input type="hidden" name="rolloutPct" value={String(currentPct)} />
        <select
          name="rollout"
          defaultValue={current}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="rounded-md border-2 border-ink-300 bg-white px-2 py-1 text-xs font-bold"
        >
          <option value="none">none</option>
          <option value="beta">beta</option>
          <option value="all">all</option>
        </select>
      </form>
      {showPct && (
        <form
          action={setFlagRolloutAction}
          className="inline-flex items-center gap-2"
        >
          <input type="hidden" name="key" value={flagKey} />
          <input type="hidden" name="rollout" value={current} />
          <input
            type="range"
            name="rolloutPct"
            min={0}
            max={100}
            step={5}
            defaultValue={currentPct}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="h-1 w-32 cursor-pointer accent-brand-700"
            title={`Rollout ${currentPct}%`}
          />
          <span className="mono min-w-[3ch] text-xs font-bold text-brand-900">
            {currentPct}%
          </span>
        </form>
      )}
    </div>
  );
}
