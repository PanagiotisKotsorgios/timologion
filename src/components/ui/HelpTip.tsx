"use client";

import { HelpCircle } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  text: string;
  className?: string;
};

type Position = {
  top: number;
  left: number;
  placement: "top" | "bottom";
};

/**
 * Small inline "?" icon next to a form label. Shows a short help tooltip
 * on hover, focus, or tap — meant for the many first-time users who don't
 * know what a Greek tax field like "Διακριτικός τίτλος" or "Έκπτ. %"
 * actually expects.
 *
 * The tooltip is rendered via a React portal onto document.body and
 * uses position: fixed. That escapes any surrounding stacking context
 * or overflow:hidden ancestor (tables, cards, modal panels) that
 * previously clipped it or hid it behind adjacent containers.
 */
export function HelpTip({ text, className }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Position | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Recompute on open, on scroll of any ancestor, and on resize so the
  // tooltip stays glued to the icon even inside virtualized tables.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const compute = () => {
      const btn = btnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const tooltipH = 90; // generous max height estimate
      const tooltipW = 260;
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placement: "top" | "bottom" =
        spaceAbove < tooltipH && spaceBelow > spaceAbove ? "bottom" : "top";
      const cx = rect.left + rect.width / 2;
      // Clamp horizontally so the tooltip never overflows the viewport.
      const half = tooltipW / 2;
      const left = Math.min(
        window.innerWidth - half - 8,
        Math.max(half + 8, cx),
      );
      const top = placement === "top" ? rect.top - 8 : rect.bottom + 8;
      setPos({ top, left, placement });
    };
    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
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
      {mounted && open && pos &&
        createPortal(
          <span
            id={tipId}
            role="tooltip"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              transform:
                pos.placement === "top"
                  ? "translate(-50%, -100%)"
                  : "translate(-50%, 0)",
              width: "260px",
              maxWidth: "calc(100vw - 16px)",
              zIndex: 9999,
              pointerEvents: "none",
            }}
            className="whitespace-normal rounded-lg border border-ink-300/70 bg-white px-3 py-2 text-left text-[13px] font-medium leading-snug text-ink-900 shadow-lg"
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
