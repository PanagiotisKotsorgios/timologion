"use client";

import { switchBusinessAction } from "@/app/app/switch-business/actions";

type BusinessOption = {
  id: string;
  label: string;
};

export function BusinessSwitcher({
  activeBusinessId,
  businesses,
}: {
  activeBusinessId: string;
  businesses: BusinessOption[];
}) {
  return (
    <form action={switchBusinessAction} className="flex items-center gap-3">
      <label
        htmlFor="business-switch"
        className="hidden text-xs font-semibold uppercase tracking-widest text-ink-500 lg:inline"
      >
        Επιχείρηση
      </label>
      <select
        id="business-switch"
        name="businessId"
        defaultValue={activeBusinessId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-11 max-w-[52vw] min-w-40 rounded-lg border-2 border-ink-300 bg-white px-4 pr-9 text-sm font-semibold text-ink-900 hover:border-ink-500 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15 transition-colors appearance-none md:min-w-56 md:text-base"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M3 4.5 6 8l3-3.5' fill='none' stroke='%230f172a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
        }}
      >
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>
            {b.label}
          </option>
        ))}
      </select>
    </form>
  );
}
