"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Fixed vertical "ΕΓΚΑΤΆΣΤΑΣΗ" button anchored to the right edge of
 * marketing pages. Text-only (no icon), rotated writing-mode so it
 * reads bottom-up. Grows into a wider bolder pill on hover with a
 * smooth premium sheen sweep.
 *
 * Hidden on:
 *   - /download itself (redundant there)
 *   - phones (<md) — competes with page content
 */
export function DownloadSideButton() {
  const pathname = usePathname();
  if (pathname === "/download") return null;

  return (
    <Link
      href="/download"
      aria-label="Εγκατάσταση εφαρμογής"
      className="group fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 md:block"
    >
      <span
        className="relative flex items-center justify-center overflow-hidden rounded-l-2xl border-2 border-r-0 border-emerald-800 bg-emerald-600 px-3 py-7 text-white shadow-[0_12px_36px_-8px_rgba(4,120,87,0.65)] transition-[padding,box-shadow,background-color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                   group-hover:bg-emerald-700 group-hover:px-5 group-hover:py-9 group-hover:shadow-[0_28px_54px_-6px_rgba(4,120,87,0.8)] group-hover:-translate-x-1
                   focus-visible:bg-emerald-700 focus-visible:px-5 focus-visible:py-9"
      >
        {/* Diagonal sheen that sweeps across on hover — pure decoration,
            no image; a translated white gradient stripe. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[220%]"
        />

        <span
          className="relative text-[16px] font-black uppercase tracking-[0.28em] transition-[font-size,letter-spacing] duration-500 ease-out
                     [writing-mode:vertical-rl] rotate-180
                     group-hover:text-[19px] group-hover:tracking-[0.34em]"
        >
          Εγκατάσταση
        </span>
      </span>
    </Link>
  );
}
