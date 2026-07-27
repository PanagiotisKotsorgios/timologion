"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Native <select> that navigates to a precomputed href on change. The
 * server-side parent (`Pagination`) resolves each option's URL up-front
 * because functions can't cross the RSC boundary — passing a
 * `sizeHref(size) => string` from server to client throws at render time.
 */
export function PageSizeSelect({
  value,
  options,
}: {
  value: number;
  options: { value: number; href: string }[];
}) {
  const router = useRouter();
  const [pending, startTx] = useTransition();

  return (
    <select
      id="page-size-select"
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = Number(e.target.value);
        if (next === value) return;
        const target = options.find((o) => o.value === next);
        if (!target) return;
        startTx(() => {
          router.push(target.href);
        });
      }}
      className="h-9 rounded-lg border-2 border-ink-300 bg-white px-2 pr-7 text-sm font-bold text-ink-900 focus:border-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-800/20 disabled:opacity-60"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.value}
        </option>
      ))}
    </select>
  );
}
