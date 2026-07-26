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
    <div className="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:flex-wrap md:items-start md:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 md:text-4xl lg:text-[42px] lg:leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-lg text-ink-700 md:text-xl">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="-mx-1 flex flex-wrap gap-2.5 md:mx-0 md:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
