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
        "rounded-2xl border border-ink-300/70 bg-white shadow-card",
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
    <div className="flex items-start justify-between gap-3 border-b border-ink-300/70 px-6 py-5 md:px-7 md:py-6">
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-extrabold text-ink-900 md:text-xl">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 text-sm text-ink-600 md:text-base">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
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
  return <div className={clsx("p-6 md:p-7", className)}>{children}</div>;
}
