"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X, PowerOff } from "lucide-react";

/**
 * Toast-style banner that auto-fades after `timeoutMs`. Rendered by the
 * plugins page whenever it receives an `?activated=` or `?deactivated=`
 * search param so the confirmation doesn't sit there forever after the
 * user has already moved on.
 */
export function AutoDismissAlert({
  title,
  body,
  tone = "success",
  timeoutMs = 6000,
}: {
  title: string;
  body: string;
  tone?: "success" | "muted";
  timeoutMs?: number;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => setVisible(false), timeoutMs);
    return () => window.clearTimeout(id);
  }, [visible, timeoutMs]);

  if (!visible) return null;

  const Icon = tone === "success" ? CheckCircle2 : PowerOff;
  const shell =
    tone === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : "border-ink-300 bg-ink-100 text-ink-900";
  const iconWrap =
    tone === "success"
      ? "bg-emerald-600 text-white"
      : "bg-ink-700 text-white";

  return (
    <div
      className={
        "mb-6 flex items-start gap-3 rounded-2xl border-2 p-4 shadow-sm transition-opacity duration-300 " +
        shell
      }
    >
      <span
        className={
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl " + iconWrap
        }
      >
        <Icon size={18} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-extrabold">{title}</p>
        <p className="mt-0.5 text-sm">{body}</p>
      </div>
      <button
        type="button"
        aria-label="Κλείσιμο"
        onClick={() => setVisible(false)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-current opacity-70 transition-opacity hover:opacity-100"
      >
        <X size={16} />
      </button>
    </div>
  );
}
