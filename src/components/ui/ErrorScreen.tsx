import type { ComponentType, ReactNode, SVGProps } from "react";

type Action = {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
  icon?: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
};

/**
 * Shared full-height error screen used by all not-found and error pages.
 * Pure server-rendered; no theme deps beyond tailwind + brand colors.
 */
export function ErrorScreen({
  code,
  title,
  description,
  actions,
  tone = "brand",
  extra,
}: {
  code: string;
  title: string;
  description: ReactNode;
  actions: Action[];
  tone?: "brand" | "warning" | "danger";
  extra?: ReactNode;
}) {
  const codeTone =
    tone === "warning"
      ? "text-amber-500"
      : tone === "danger"
        ? "text-red-600"
        : "text-brand-700";

  return (
    <div className="min-h-[60vh] w-full">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center md:py-24">
        <p
          className={`text-[96px] font-extrabold leading-none tracking-tightest md:text-[144px] ${codeTone}`}
        >
          {code}
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 md:text-5xl">
          {title}
        </h1>
        <div className="mt-6 max-w-xl text-lg leading-relaxed text-ink-700">
          {description}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {actions.map((a) => {
            const Icon = a.icon;
            const isPrimary = (a.variant ?? "primary") === "primary";
            return (
              <a
                key={a.href + a.label}
                href={a.href}
                className={
                  isPrimary
                    ? "inline-flex h-14 items-center gap-2 rounded-lg bg-brand-700 px-6 text-lg font-semibold text-white hover:bg-brand-800"
                    : "inline-flex h-14 items-center gap-2 rounded-lg border-2 border-ink-300 bg-white px-6 text-lg font-semibold text-ink-900 hover:border-ink-500 hover:bg-ink-100"
                }
              >
                {Icon && <Icon size={20} aria-hidden />}
                {a.label}
              </a>
            );
          })}
        </div>

        {extra && <div className="mt-10">{extra}</div>}
      </div>
    </div>
  );
}
