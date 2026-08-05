"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { X, Receipt, CalendarClock, User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { RecordPaymentForDocButton } from "./RecordPaymentForDocButton";
import { MarkAsPaidButton } from "./MarkAsPaidButton";

/**
 * Client-side wrapper for the "open documents" table. Owns two things
 * the server component can't:
 *
 *   1. Row-click → opens a detail popup with the invoice's stats and
 *      BOTH primary actions (Καταχώρηση / Εξόφληση) surfaced together.
 *      Clicks on interactive descendants (link cells, existing buttons)
 *      keep their own behavior — we detect them with `closest("a,button")`.
 *
 *   2. Escape + backdrop close for the popup.
 */
export type OpenDocRow = {
  id: string;
  clientId: string | null;
  clientLabel: string;
  clientVat: string | null;
  docLabel: string;
  typeLabel: string;
  totalOwed: number;
  paid: number;
  outstanding: number;
  daysOpen: number;
  issueDateIso: string;
  issueDateDisplay: string;
};

export function OpenDocsTable({ rows }: { rows: OpenDocRow[] }) {
  const [active, setActive] = useState<OpenDocRow | null>(null);

  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActive(null);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [active]);

  const nfEur = new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });

  return (
    <>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.id}
            className="cursor-pointer transition-colors hover:bg-brand-50/60"
            onClick={(e) => {
              const target = e.target as HTMLElement | null;
              if (target?.closest("a, button, form, [role='dialog']")) return;
              setActive(r);
            }}
          >
            <td className="mono">
              <Link
                href={`/app/documents/${r.id}`}
                className="font-semibold text-brand-800 hover:text-brand-900"
              >
                {r.issueDateDisplay}
              </Link>
            </td>
            <td
              className="truncate-cell text-sm text-ink-900"
              title={r.clientLabel}
              style={{ maxWidth: "240px" }}
            >
              {r.clientLabel}
            </td>
            <td className="mono text-sm">{r.docLabel}</td>
            <td>
              <Badge tone="neutral">{r.typeLabel}</Badge>
            </td>
            <td className="text-right font-semibold">
              {nfEur.format(r.totalOwed)}
            </td>
            <td className="text-right text-sm text-ink-700">
              {r.paid > 0 ? nfEur.format(r.paid) : "—"}
            </td>
            <td className="text-right font-extrabold text-red-700">
              {nfEur.format(r.outstanding)}
            </td>
            <td>
              <AgingChip days={r.daysOpen} />
            </td>
            <td className="text-right">
              <div className="inline-flex flex-wrap items-center justify-end gap-2">
                <RecordPaymentForDocButton
                  documentId={r.id}
                  clientId={r.clientId}
                  outstanding={r.outstanding}
                  clientLabel={r.clientLabel}
                  docLabel={r.docLabel}
                />
                <MarkAsPaidButton
                  documentId={r.id}
                  docLabel={r.docLabel}
                  clientLabel={r.clientLabel}
                  outstanding={r.outstanding}
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>

      {active && (
        <OpenDocDetailPopup
          row={active}
          onClose={() => setActive(null)}
        />
      )}
    </>
  );
}

function OpenDocDetailPopup({
  row,
  onClose,
}: {
  row: OpenDocRow;
  onClose: () => void;
}) {
  const nfEur = new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
  const pct =
    row.totalOwed > 0
      ? Math.min(100, Math.round((row.paid / row.totalOwed) * 100))
      : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="open-doc-title"
      className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto p-4 py-10 sm:p-8"
    >
      <button
        type="button"
        aria-label="Κλείσιμο"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-ink-300/70 bg-white shadow-2xl">
        {/* Colored header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-900 to-brand-800 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
                Ανοικτό παραστατικό
              </p>
              <h2
                id="open-doc-title"
                className="mt-0.5 flex items-center gap-2 text-xl font-extrabold sm:text-2xl"
              >
                <Receipt size={18} aria-hidden />
                <span className="mono">{row.docLabel}</span>
                <Badge tone="warning">{row.typeLabel}</Badge>
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
                <User size={13} aria-hidden />
                {row.clientLabel}
                {row.clientVat && (
                  <span className="mono text-xs text-white/60">
                    · ΑΦΜ {row.clientVat}
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              aria-label="Κλείσιμο"
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-baseline justify-between text-xs text-white/80">
              <span>Εξόφληση</span>
              <span className="mono font-bold text-white">
                {nfEur.format(row.paid)} / {nfEur.format(row.totalOwed)}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-5 p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Info
              label="Σύνολο"
              value={nfEur.format(row.totalOwed)}
              tone="muted"
            />
            <Info
              label="Έχει εισπραχθεί"
              value={row.paid > 0 ? nfEur.format(row.paid) : "—"}
              tone="success"
            />
            <Info
              label="Υπόλοιπο"
              value={nfEur.format(row.outstanding)}
              tone="danger"
            />
          </div>

          <div className="grid gap-2 rounded-lg bg-ink-50/60 p-3 text-[13px] sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <CalendarClock size={13} className="text-ink-500" aria-hidden />
              <span className="text-ink-700">Ημ/νία έκδοσης:</span>
              <span className="font-bold text-ink-900">
                {row.issueDateDisplay}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarClock size={13} className="text-ink-500" aria-hidden />
              <span className="text-ink-700">Αδράνεια:</span>
              <span className="font-bold text-ink-900">{row.daysOpen} ημέρες</span>
            </div>
          </div>

          <div className="border-t border-ink-200 pt-4">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-ink-500">
              Ενέργειες
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <RecordPaymentForDocButton
                documentId={row.id}
                clientId={row.clientId}
                outstanding={row.outstanding}
                clientLabel={row.clientLabel}
                docLabel={row.docLabel}
              />
              <MarkAsPaidButton
                documentId={row.id}
                docLabel={row.docLabel}
                clientLabel={row.clientLabel}
                outstanding={row.outstanding}
              />
              <Link
                href={`/app/documents/${row.id}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-ink-300 bg-white px-4 text-sm font-bold text-ink-900 hover:bg-ink-100"
              >
                Άνοιγμα παραστατικού
              </Link>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-ink-300/60 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-lg border-2 border-ink-300 bg-white px-5 text-sm font-bold text-ink-900 hover:bg-ink-100"
          >
            Κλείσιμο
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "muted" | "success" | "danger";
}) {
  const cls =
    tone === "danger"
      ? "border-red-300 bg-red-50 text-red-900"
      : tone === "success"
        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
        : "border-ink-300 bg-white text-ink-900";
  return (
    <div className={`rounded-xl border-2 p-3 ${cls}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
        {label}
      </p>
      <p className="mt-1 mono text-lg font-black tabular-nums">{value}</p>
    </div>
  );
}

function AgingChip({ days }: { days: number }) {
  let tone: "muted" | "brand" | "warning" | "danger" = "muted";
  if (days > 60) tone = "danger";
  else if (days > 30) tone = "warning";
  else if (days > 7) tone = "brand";
  const label = `${days} ημ.`;
  return <Badge tone={tone}>{label}</Badge>;
}

// Re-export type helper for the parent to satisfy TypeScript without
// duplicating the shape.
export type { ReactNode };
