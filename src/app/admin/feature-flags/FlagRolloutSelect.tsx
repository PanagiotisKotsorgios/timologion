"use client";

import { setFlagRolloutAction } from "./actions";

export function FlagRolloutSelect({
  flagKey,
  current,
}: {
  flagKey: string;
  current: "none" | "beta" | "all";
}) {
  return (
    <form action={setFlagRolloutAction}>
      <input type="hidden" name="key" value={flagKey} />
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
  );
}
