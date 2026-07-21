import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-ink-300 bg-white p-8 text-center">
      <p className="text-sm font-medium text-ink-900">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-ink-500">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
