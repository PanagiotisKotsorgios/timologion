"use client";

import { HelpCircle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type Props = {
  text: string;
  className?: string;
};

/**
 * Small inline "?" icon next to a form label. Shows a short help tooltip
 * on hover, focus, or tap — meant for the many first-time users who don't
 * know what a Greek tax field like "Διακριτικός τίτλος" or "Έκπτ. %"
 * actually expects.
 *
 * Tooltip is positioned absolutely, above the icon by default, with a
 * portal-free fallback that flips to below if there isn't room above.
 */
export function HelpTip({ text, className }: Props) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"top" | "bottom">("top");
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipId = useId();

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPlacement(rect.top < 120 ? "bottom" : "top");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <span className={`relative inline-flex ${className ?? ""}`}>
      <button
        ref={btnRef}
        type="button"
        aria-label="Βοήθεια"
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-brand-100 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
      >
        <HelpCircle size={14} strokeWidth={2.25} aria-hidden />
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className={`absolute left-1/2 z-50 w-64 -translate-x-1/2 whitespace-normal rounded-lg border border-ink-300/70 bg-white px-3 py-2 text-left text-[13px] font-medium leading-snug text-ink-900 shadow-lg ${
            placement === "top" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {text}
        </span>
      )}
    </span>
  );
}
