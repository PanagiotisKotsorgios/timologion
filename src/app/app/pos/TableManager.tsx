"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X, UtensilsCrossed, Settings2 } from "lucide-react";
import { createPosTableAction, deletePosTableAction } from "./actions";

/**
 * Table management — trigger button + modal. Shows existing tables in
 * a scrollable list with per-row delete, plus an inline "Προσθήκη"
 * form at the top. Handles create + delete without leaving the modal;
 * router.refresh() syncs the underlying page.
 *
 * The trigger is a compact "Διαχείριση τραπεζιών" chip that sits in
 * the Card header — modal keeps the main POS grid uncluttered.
 */
export function TableManager() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border-2 border-ink-300 bg-white px-3 text-xs font-bold text-ink-900 transition-colors hover:border-ink-900 hover:bg-ink-900 hover:text-white sm:text-sm"
      >
        <Settings2 size={14} strokeWidth={2.5} aria-hidden />
        Διαχείριση τραπεζιών
      </button>
      {open && <ManageModal onClose={() => setOpen(false)} />}
    </>
  );
}

type ManagedTable = {
  id: string;
  label: string;
  seats: number;
  hasOpenTab: boolean;
};

function ManageModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [seats, setSeats] = useState("2");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTx] = useTransition();
  const [tables, setTables] = useState<ManagedTable[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    fetch("/api/pos/tables", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { tables: [] }))
      .then((data: { tables?: ManagedTable[] }) => {
        setTables(data.tables ?? []);
        setLoadingList(false);
      })
      .catch(() => setLoadingList(false));
  }, []);

  async function reloadTables() {
    const r = await fetch("/api/pos/tables", { cache: "no-store" });
    if (r.ok) {
      const data = (await r.json()) as { tables?: ManagedTable[] };
      setTables(data.tables ?? []);
    }
  }

  function add() {
    if (!label.trim()) return;
    setError(null);
    const fd = new FormData();
    fd.set("label", label);
    fd.set("seats", seats);
    startTx(async () => {
      const res = await createPosTableAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLabel("");
      setSeats("2");
      await reloadTables();
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Οριστική διαγραφή του τραπεζιού;")) return;
    const fd = new FormData();
    fd.set("id", id);
    startTx(async () => {
      await deletePosTableAction(fd);
      await reloadTables();
      router.refresh();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tables-manage-title"
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 py-10 sm:p-8"
    >
      <button
        type="button"
        aria-label="Κλείσιμο"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-ink-300/70 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-ink-300/60 bg-brand-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-brand-800 shadow-sm">
              <UtensilsCrossed size={22} strokeWidth={2} aria-hidden />
            </div>
            <div>
              <h2
                id="tables-manage-title"
                className="text-lg font-extrabold text-brand-900 sm:text-xl"
              >
                Διαχείριση τραπεζιών
              </h2>
              <p className="mt-0.5 text-xs text-ink-700">
                Πρόσθεσε ή διάγραψε τραπέζια. Τα κατειλημμένα δεν διαγράφονται.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Κλείσιμο"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-ink-500">
            Προσθήκη νέου τραπεζιού
          </p>
          {error && (
            <p className="mb-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_100px_auto]">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && label.trim()) {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder="π.χ. Τραπέζι 5"
              maxLength={60}
              className="h-11 w-full rounded-lg border-2 border-ink-300 bg-white px-3 text-base text-ink-900 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
            />
            <input
              type="number"
              min="1"
              max="30"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              placeholder="Θέσεις"
              className="h-11 w-full rounded-lg border-2 border-ink-300 bg-white px-3 text-base text-ink-900 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
            />
            <button
              type="button"
              onClick={add}
              disabled={pending || !label.trim()}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border-2 border-emerald-700 bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={14} strokeWidth={3} aria-hidden />
              Προσθήκη
            </button>
          </div>

          <div className="mt-5 border-t-2 border-ink-200 pt-4">
            <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-ink-500">
              Υπάρχοντα τραπέζια ({tables.length})
            </p>
            {loadingList ? (
              <p className="py-4 text-center text-sm text-ink-500">
                Φόρτωση...
              </p>
            ) : tables.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-500">
                Δεν έχεις τραπέζια ακόμη.
              </p>
            ) : (
              <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {tables.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-lg border-2 border-ink-200 bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-brand-900">
                        {t.label}
                      </p>
                      <p className="text-[11px] text-ink-500">
                        {t.seats} θέσεις
                        {t.hasOpenTab && (
                          <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                            Κατειλημμένο
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(t.id)}
                      disabled={t.hasOpenTab || pending}
                      title={
                        t.hasOpenTab
                          ? "Κλείσε πρώτα τον λογαριασμό"
                          : "Διαγραφή"
                      }
                      aria-label={`Διαγραφή ${t.label}`}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-red-300 bg-red-50 text-red-700 hover:border-red-700 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:border-ink-300 disabled:bg-ink-100 disabled:text-ink-500"
                    >
                      <Trash2 size={14} strokeWidth={2.5} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-ink-300/60 px-5 py-4">
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
