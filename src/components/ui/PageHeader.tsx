import type { ReactNode } from "react";

/**
 * Responsive page header. Actions stack below the title on tablets and
 * phones (only side-by-side on ≥lg) so the print/PDF/email button row
 * never crashes into the invoice-type title on medium screens.
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
    <div className="no-print mb-6 flex flex-col gap-4 md:mb-8 lg:mb-10 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="break-words text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl md:text-4xl lg:text-[42px] lg:leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 break-words text-base text-ink-700 sm:text-lg md:text-xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:gap-2.5">
          {actions}
        </div>
      )}
    </div>
  );
}
