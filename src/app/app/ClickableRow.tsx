"use client";

import type { ReactNode } from "react";

/**
 * Row wrapper that forwards a whole-row click to the anchor with
 * `data-row-anchor`. Kept as a client component so `onClick` doesn't cross
 * the RSC boundary — server pages can just render it and pass children.
 */
export function ClickableRow({ children }: { children: ReactNode }) {
  return (
    <tr
      className="cursor-pointer"
      onClick={(e) => {
        const anchor =
          e.currentTarget.querySelector<HTMLAnchorElement>(
            "a[data-row-anchor]",
          );
        anchor?.click();
      }}
    >
      {children}
    </tr>
  );
}
