"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, FileText, FileType2, ChevronDown } from "lucide-react";

/**
 * Small dropdown export button. Renders as "Εξαγωγή ▾" and opens a menu
 * with XLSX / CSV / PDF options that all point at the same backend URL
 * with different `?format=` query params. Used on list pages
 * (Πληρωμές, Παραστατικά, Πελάτες, Είδη, Έξοδα, Ραντεβού).
 */
export function ExportMenu({
  baseUrl,
  extraQuery,
  formats = ["xlsx", "csv", "pdf"],
  label = "Εξαγωγή",
  align = "right",
}: {
  baseUrl: string;
  extraQuery?: string;
  formats?: ("xlsx" | "csv" | "pdf")[];
  label?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const q = extraQuery ? `${extraQuery}&` : "";
  const items = formats.map((f) => {
    const meta = FORMAT_META[f];
    return {
      href: `${baseUrl}?${q}format=${f}`,
      label: meta.label,
      icon: meta.icon,
      sub: meta.sub,
    };
  });

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 items-center gap-2 rounded-lg border-2 border-ink-300 bg-white px-4 text-sm font-bold text-ink-900 transition-colors hover:border-ink-900 hover:bg-ink-900 hover:text-white focus:outline-none focus:ring-4 focus:ring-brand-500/20"
      >
        <Download size={16} strokeWidth={2.25} />
        {label}
        <ChevronDown size={14} strokeWidth={2.5} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {open && (
        <div
          className={`absolute z-50 mt-2 w-64 rounded-xl border border-ink-300/70 bg-white p-1.5 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
          role="menu"
        >
          {items.map((it) => (
            <a
              key={it.href}
              href={it.href}
              onClick={() => setOpen(false)}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-brand-50"
              role="menuitem"
            >
              <it.icon size={20} strokeWidth={2} className="mt-0.5 shrink-0 text-brand-800" aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink-900">{it.label}</span>
                <span className="block text-xs text-ink-700">{it.sub}</span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

const FORMAT_META = {
  xlsx: {
    label: "Excel (XLSX)",
    sub: "Προτεινόμενο — ανοίγει σε Excel/Numbers/LibreOffice",
    icon: FileSpreadsheet,
  },
  csv: {
    label: "CSV",
    sub: "Απλό κείμενο διαχωρισμένο με κόμματα",
    icon: FileText,
  },
  pdf: {
    label: "PDF",
    sub: "Έτοιμο για εκτύπωση / αποστολή",
    icon: FileType2,
  },
} as const;
