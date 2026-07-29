import type { ReactNode } from "react";

/**
 * Responsive page header.
 *
 * Layout tiers:
 *   - default    → title on top, actions row wraps beneath (phones + small laptops)
 *   - ≥ xl       → title left / actions right (only when there's enough room)
 *
 * We wait for xl (1280px) — not lg — because our list pages regularly
 * have 3-5 chunky action buttons and any small-laptop layout that puts
 * them side-by-side squeezes the title into a letter-by-letter stack
 * (Screenshot 2026-07-29 200924.jpg). Better to stack cleanly on
 * anything under 1280px than to fight for room.
 *
 * Title also has hard `min-w` guards + `[overflow-wrap:normal]` so a
 * single long Greek word never falls apart into vertical characters
 * even when it does end up side-by-side with a wide actions row.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="no-print mb-6 flex flex-col gap-4 md:mb-8 xl:mb-10 xl:flex-row xl:flex-wrap xl:items-start xl:justify-between">
      <div className="min-w-0 flex-1 xl:min-w-[320px]">
        <h1
          className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl md:text-4xl xl:text-[42px] xl:leading-tight"
          style={{ overflowWrap: "normal", wordBreak: "normal", hyphens: "manual" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="mt-2 text-base text-ink-700 sm:text-lg md:text-xl"
            style={{ overflowWrap: "normal", wordBreak: "normal" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 xl:justify-end xl:gap-2.5">
          {actions}
        </div>
      )}
    </div>
  );
}
