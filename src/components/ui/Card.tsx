import type { ReactNode } from "react";
import clsx from "clsx";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={clsx(
        "min-w-0 overflow-hidden rounded-2xl border border-ink-300/70 bg-white shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      data-card-header
      className="flex flex-col gap-2 border-b border-ink-300/70 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-6 sm:py-5 md:px-7 md:py-6"
    >
      <div className="min-w-0 flex-1">
        <h3 className="break-words text-base font-extrabold text-ink-900 sm:text-lg md:text-xl">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 break-words text-sm text-ink-600 md:text-base">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-2.5">
          {action}
        </div>
      )}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-card-body className={clsx("min-w-0 p-4 sm:p-6 md:p-7", className)}>
      {children}
    </div>
  );
}
