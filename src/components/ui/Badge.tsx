import type { ReactNode } from "react";
import clsx from "clsx";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "muted";

const tones: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700 border-ink-300",
  brand: "bg-brand-50 text-brand-700 border-brand-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  muted: "bg-ink-100 text-ink-500 border-ink-300",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
