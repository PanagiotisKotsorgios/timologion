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
    <div className="rounded-2xl border-2 border-dashed border-ink-300 bg-white p-10 text-center md:p-14">
      <p className="text-xl font-extrabold text-ink-900 md:text-2xl">{title}</p>
      {description && (
        <p className="mx-auto mt-3 max-w-md text-base text-ink-600 md:text-lg">
          {description}
        </p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
