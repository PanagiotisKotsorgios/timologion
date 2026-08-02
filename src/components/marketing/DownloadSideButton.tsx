"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download } from "lucide-react";

/**
 * Fixed vertical "Εγκατάσταση" button anchored to the right edge of
 * the viewport on marketing pages. Collapsed by default (thin bar with
 * rotated label), expands on hover into a full pill.
 *
 * Hidden on:
 *   - the /download page itself (would be redundant)
 *   - phones (would compete with page content and the bottom-nav zone)
 */
export function DownloadSideButton() {
  const pathname = usePathname();
  if (pathname === "/download") return null;

  return (
    <Link
      href="/download"
      aria-label="Εγκατάσταση εφαρμογής"
      className="group fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 md:flex"
    >
      <span
        className="flex items-center gap-2 rounded-l-2xl border-2 border-r-0 border-emerald-800 bg-emerald-600 py-4 pr-2 text-white shadow-[0_10px_30px_-10px_rgba(4,120,87,0.7)] transition-all duration-300 ease-out
                   pl-2.5 hover:pl-4 hover:pr-4 hover:bg-emerald-700 hover:shadow-[0_20px_40px_-8px_rgba(4,120,87,0.75)] hover:translate-x-0
                   focus-visible:pl-4 focus-visible:pr-4 focus-visible:bg-emerald-700"
      >
        {/* Icon — always visible. Slight scale-up + pulse ring on hover. */}
        <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-800/50 transition-all group-hover:h-10 group-hover:w-10 group-hover:bg-emerald-800">
          <Download
            size={16}
            strokeWidth={2.5}
            className="transition-transform group-hover:scale-110"
            aria-hidden
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-full ring-2 ring-emerald-400/50 opacity-0 transition-opacity group-hover:opacity-100 group-hover:animate-ping"
          />
        </span>

        {/* Vertical label — collapsed default, expands to horizontal on hover. */}
        <span
          className="text-[13px] font-black uppercase tracking-[0.2em] transition-all duration-300 ease-out
                     [writing-mode:vertical-rl] rotate-180 max-h-40 opacity-90
                     group-hover:[writing-mode:horizontal-tb] group-hover:rotate-0
                     group-hover:max-h-none group-hover:opacity-100 group-hover:tracking-widest"
        >
          Εγκατάσταση
        </span>
      </span>
    </Link>
  );
}
