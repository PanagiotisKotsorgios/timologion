"use client";

import type { ReactNode } from "react";

/**
 * Row wrapper that forwards a whole-row click to the anchor with
 * `data-row-anchor`. Kept as a client component so `onClick` doesn't cross
 * the RSC boundary — server pages can just render it and pass children.
 *
 * Ignores clicks on nested interactive elements (buttons, other links,
 * inputs, select, textarea, menus) so per-row actions like the RowActions
 * kebab menu still work without double-navigation.
 */
export function ClickableRow({ children }: { children: ReactNode }) {
  return (
    <tr
      className="cursor-pointer"
      onClick={(e) => {
        const target = e.target as HTMLElement | null;
        if (
          target?.closest(
            'a, button, input, select, textarea, [role="menu"], [role="button"], [role="menuitem"]',
          )
        ) {
          return;
        }
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
