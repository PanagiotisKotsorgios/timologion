import type { ReactNode } from "react";
import clsx from "clsx";

type Tone = "info" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  info: "bg-brand-50 text-brand-900 border-brand-300",
  success: "bg-emerald-50 text-emerald-900 border-emerald-300",
  warning: "bg-amber-50 text-amber-900 border-amber-300",
  danger: "bg-red-50 text-red-900 border-red-300",
};

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border-2 px-5 py-4 text-base leading-relaxed",
        tones[tone],
      )}
      role="alert"
    >
      {title && <div className="text-lg font-semibold">{title}</div>}
      {children && <div className={clsx(title && "mt-1.5")}>{children}</div>}
    </div>
  );
}
