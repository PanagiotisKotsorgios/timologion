"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { importItemsCsvAction, type ImportItemsResult } from "./actions";

export function ImportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        icon={Upload}
        onClick={() => setOpen(true)}
      >
        Εισαγωγή CSV
      </Button>
      {open && <ImportDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportItemsResult | null>(null);
  const [pending, startTx] = useTransition();

  function submit() {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    startTx(async () => {
      const res = await importItemsCsvAction(fd);
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border-2 border-ink-300 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-brand-900">Εισαγωγή ειδών από CSV</h2>
            <p className="mt-1 text-sm text-ink-700">
              Το αρχείο πρέπει να έχει τουλάχιστον στήλη <code>name</code> ή{" "}
              <code>Ονομασία</code>. Ταιριάξιμο με υπάρχοντα είδη γίνεται μέσω{" "}
              <code>code</code>.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-500 hover:text-ink-900"
            aria-label="Κλείσιμο"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 rounded-lg border-2 border-dashed border-ink-300 bg-ink-50 p-4">
          <label className="flex cursor-pointer items-center gap-3">
            <FileUp size={20} className="text-brand-700" />
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

        <details className="mt-4 rounded-lg bg-ink-100 p-3 text-xs text-ink-700">
          <summary className="cursor-pointer font-semibold">
            Υποστηριζόμενες στήλες
          </summary>
          <ul className="mt-2 space-y-1">
            <li>
              <code>name</code> / <code>Ονομασία</code> — υποχρεωτικό
            </li>
            <li>
              <code>code</code> / <code>Κωδικός</code> — για ανανέωση υπάρχοντος είδους
            </li>
            <li>
              <code>kind</code> / <code>Τύπος</code> — service / product
            </li>
            <li>
              <code>unit</code>, <code>defaultPrice</code>, <code>vatRate</code>,{" "}
              <code>description</code>
            </li>
          </ul>
        </details>

        {result && (
          <div
            className={`mt-4 rounded-lg p-3 text-sm ${
              result.ok
                ? "bg-green-50 text-green-800"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            <p className="font-semibold">
              {result.ok ? "Επιτυχής εισαγωγή." : "Ολοκληρώθηκε με σφάλματα."}
            </p>
            <p className="mt-1">
              Δημιουργήθηκαν: <strong>{result.created}</strong>, Ενημερώθηκαν:{" "}
              <strong>{result.updated}</strong>, Παραβλέφθηκαν:{" "}
              <strong>{result.skipped}</strong>
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 max-h-32 list-disc overflow-y-auto pl-5 text-xs">
                {result.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>
                    Γραμμή {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Κλείσιμο
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={!file || pending}
            icon={Upload}
          >
            {pending ? "Εισαγωγή..." : "Εισαγωγή"}
          </Button>
        </div>
      </div>
    </div>
  );
}
