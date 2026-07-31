"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileUp, Download, X, FileSpreadsheet } from "lucide-react";

export type ImportResult = {
  ok: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

export type CsvColumnSpec = {
  header: string;
  aliases?: string[];
  required?: boolean;
  hint?: string;
};

/**
 * Reusable CSV import dialog. Shows the button, opens a modal with:
 *   - File picker
 *   - Column reference (name + aliases + hint per field)
 *   - "Λήψη προτύπου" template CSV download
 *   - Result panel (created / updated / skipped + per-row errors)
 *
 * The parent supplies:
 *   - `entityLabel` — display name in headings ("πελατών", "εξόδων", "ειδών")
 *   - `columns` — spec used both for the reference list AND to build the
 *     downloadable template
 *   - `action` — server action that receives FormData (file) and returns
 *     an ImportResult
 *   - `buttonColor` — Tailwind pair for the trigger button (bg/border)
 */
export function CsvImportButton({
  entityLabel,
  templateFilename,
  columns,
  action,
  buttonColor = "bg-teal-600 border-teal-700 hover:bg-teal-700",
  label = "Εισαγωγή CSV",
}: {
  entityLabel: string;
  templateFilename: string;
  columns: CsvColumnSpec[];
  action: (fd: FormData) => Promise<ImportResult>;
  buttonColor?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  function downloadTemplate() {
    const headers = columns.map((c) => c.header).join(",");
    const sampleRow = columns.map(() => "").join(",");
    const csv = `﻿${headers}\n${sampleRow}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = templateFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex h-10 items-center gap-2 rounded-lg border-2 px-4 text-sm font-bold text-white shadow-sm transition-colors sm:h-11 sm:text-base ${buttonColor}`}
      >
        <Upload size={16} strokeWidth={2.5} aria-hidden />
        {label}
      </button>
      {open && (
        <ImportDialog
          entityLabel={entityLabel}
          templateFilename={templateFilename}
          columns={columns}
          action={action}
          onClose={() => setOpen(false)}
          onDownloadTemplate={downloadTemplate}
        />
      )}
    </>
  );
}

function ImportDialog({
  entityLabel,
  columns,
  action,
  onClose,
  onDownloadTemplate,
}: {
  entityLabel: string;
  templateFilename: string;
  columns: CsvColumnSpec[];
  action: (fd: FormData) => Promise<ImportResult>;
  onClose: () => void;
  onDownloadTemplate: () => void;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTx] = useTransition();

  function submit() {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    startTx(async () => {
      const res = await action(fd);
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  const requiredCols = columns.filter((c) => c.required);
  const optionalCols = columns.filter((c) => !c.required);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] grid place-items-start justify-center overflow-y-auto bg-black/50 p-3 py-8 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-ink-300/70 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink-300/60 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-800">
              <FileSpreadsheet size={20} aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-brand-900 sm:text-xl">
                Εισαγωγή {entityLabel} από CSV
              </h2>
              <p className="mt-0.5 text-sm text-ink-700">
                Ανέβασε αρχείο CSV ή κατέβασε το πρότυπο για να δεις τη μορφή.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Κλείσιμο"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <button
            type="button"
            onClick={onDownloadTemplate}
            className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-brand-800 bg-brand-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-brand-800"
          >
            <Download size={16} strokeWidth={2.5} aria-hidden />
            Λήψη προτύπου CSV
          </button>

          <div className="rounded-lg border-2 border-dashed border-ink-300 bg-ink-50 p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <FileUp size={20} className="text-brand-700" aria-hidden />
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setResult(null);
                }}
                className="flex-1 text-sm"
              />
            </label>
            {file && (
              <p className="mt-2 text-xs text-ink-700">
                {file.name} · {Math.round(file.size / 1024)} KB
              </p>
            )}
          </div>

          <div className="rounded-lg bg-ink-50 p-3 text-xs">
            <p className="font-black uppercase tracking-widest text-ink-700">
              Στήλες που διαβάζουμε
            </p>
            {requiredCols.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-700">
                  Υποχρεωτικές
                </p>
                <ul className="mt-1 space-y-1">
                  {requiredCols.map((c) => (
                    <li key={c.header} className="text-ink-900">
                      <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">
                        {c.header}
                      </code>
                      {c.aliases && c.aliases.length > 0 && (
                        <span className="text-ink-600">
                          {" "}
                          ή {c.aliases.map((a) => `«${a}»`).join(" / ")}
                        </span>
                      )}
                      {c.hint && (
                        <span className="ml-1 text-ink-700">— {c.hint}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {optionalCols.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500">
                  Προαιρετικές
                </p>
                <ul className="mt-1 space-y-1">
                  {optionalCols.map((c) => (
                    <li key={c.header} className="text-ink-900">
                      <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">
                        {c.header}
                      </code>
                      {c.aliases && c.aliases.length > 0 && (
                        <span className="text-ink-600">
                          {" "}
                          ή {c.aliases.map((a) => `«${a}»`).join(" / ")}
                        </span>
                      )}
                      {c.hint && (
                        <span className="ml-1 text-ink-700">— {c.hint}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {result && (
            <div
              className={`rounded-lg p-3 text-sm ${
                result.ok
                  ? "bg-green-50 text-green-800"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              <p className="font-bold">
                {result.ok ? "Επιτυχής εισαγωγή." : "Ολοκληρώθηκε με σφάλματα."}
              </p>
              <p className="mt-1">
                Δημιουργήθηκαν: <strong>{result.created}</strong>,
                Ενημερώθηκαν: <strong>{result.updated}</strong>,
                Παραβλέφθηκαν: <strong>{result.skipped}</strong>
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 max-h-40 list-disc overflow-y-auto pl-5 text-xs">
                  {result.errors.slice(0, 30).map((e, i) => (
                    <li key={i}>
                      Γραμμή {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-ink-300/60 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-lg border-2 border-ink-300 bg-white px-5 text-sm font-bold text-ink-900 hover:bg-ink-100"
          >
            Κλείσιμο
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!file || pending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border-2 border-emerald-700 bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload size={16} strokeWidth={2.5} aria-hidden />
            {pending ? "Εισαγωγή..." : "Εισαγωγή"}
          </button>
        </div>
      </div>
    </div>
  );
}
