import type { ReactNode } from "react";

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
    <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:flex-wrap md:items-start md:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 md:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-base text-ink-700">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="-mx-1 flex flex-wrap gap-2 md:mx-0 md:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
