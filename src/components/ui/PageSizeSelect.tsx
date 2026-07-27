"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Native <select> that navigates to `sizeHref(size)` on change. Client-only
 * because we need an event handler; the parent Pagination is otherwise a
 * pure server component.
 */
export function PageSizeSelect({
  value,
  options,
  sizeHref,
}: {
  value: number;
  options: number[];
  sizeHref: (size: number) => string;
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
        startTx(() => {
          router.push(sizeHref(next));
        });
      }}
      className="h-9 rounded-lg border-2 border-ink-300 bg-white px-2 pr-7 text-sm font-bold text-ink-900 focus:border-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-800/20 disabled:opacity-60"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
