"use client";

import { createContext, useContext, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { bulkDeleteDraftsAction } from "./actions";

type Ctx = {
  draftIds: string[];
  selected: Set<string>;
  toggle: (id: string) => void;
  toggleAll: () => void;
  clear: () => void;
  allSelected: boolean;
  anySelected: boolean;
};

const BulkCtx = createContext<Ctx | null>(null);

function useBulkCtx() {
  const c = useContext(BulkCtx);
  if (!c) throw new Error("Bulk context missing");
  return c;
}

export function BulkDraftsProvider({
  draftIds,
  children,
}: {
  draftIds: string[];
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const value = useMemo<Ctx>(() => {
    const allSelected = draftIds.length > 0 && draftIds.every((id) => selected.has(id));
    return {
      draftIds,
      selected,
      toggle: (id: string) =>
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      toggleAll: () =>
        setSelected((prev) => {
          if (draftIds.length > 0 && draftIds.every((id) => prev.has(id))) {
            return new Set();
          }
          return new Set(draftIds);
        }),
      clear: () => setSelected(new Set()),
      allSelected,
      anySelected: selected.size > 0,
    };
  }, [draftIds, selected]);
  return <BulkCtx.Provider value={value}>{children}</BulkCtx.Provider>;
}

export function DraftSelectAllCheckbox() {
  const { draftIds, allSelected, toggleAll } = useBulkCtx();
  if (draftIds.length === 0) return null;
  return (
    <label
      className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-700"
      title="Επιλογή όλων των πρόχειρων στη σελίδα"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={allSelected}
        onChange={toggleAll}
        className="h-4 w-4 cursor-pointer rounded border-ink-400 accent-brand-700"
        aria-label="Επιλογή όλων"
      />
      <span>Όλα</span>
    </label>
  );
}

export function DraftRowCheckbox({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const { selected, toggle } = useBulkCtx();
  if (status !== "draft") {
    return <span className="inline-block h-4 w-4" aria-hidden />;
  }
  return (
    <input
      type="checkbox"
      checked={selected.has(id)}
      onChange={() => toggle(id)}
      onClick={(e) => e.stopPropagation()}
      className="h-4 w-4 cursor-pointer rounded border-ink-400 accent-brand-700"
      aria-label="Επιλογή πρόχειρου"
    />
  );
}

export function BulkDeleteBar() {
  const { selected, clear, draftIds } = useBulkCtx();
  const router = useRouter();
  const [pending, start] = useTransition();
  const count = selected.size;
  if (draftIds.length === 0) return null;

  return (
    <div
      className={`sticky top-2 z-30 mb-3 flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-2.5 shadow-sm transition-opacity ${
        count > 0
          ? "border-red-700 bg-red-50 opacity-100"
          : "pointer-events-none border-transparent bg-transparent opacity-0"
      }`}
      aria-hidden={count === 0}
    >
      <div className="text-sm font-semibold text-red-900">
        {count} {count === 1 ? "επιλεγμένο πρόχειρο" : "επιλεγμένα πρόχειρα"}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={clear}
          disabled={pending}
          className="rounded-lg border-2 border-ink-300 bg-white px-3 py-1.5 text-sm font-semibold text-ink-800 hover:bg-ink-50 disabled:opacity-60"
        >
          Καθαρισμός
        </button>
        <button
          type="button"
          disabled={pending || count === 0}
          onClick={() => {
            if (
              !confirm(
                `Οριστική διαγραφή ${count} ${count === 1 ? "πρόχειρου" : "πρόχειρων"};`,
              )
            )
              return;
            const ids = Array.from(selected);
            start(async () => {
              const res = await bulkDeleteDraftsAction(ids);
              if (res.ok) {
                clear();
                router.refresh();
              } else {
                alert("Η μαζική διαγραφή απέτυχε.");
              }
            });
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-red-700 bg-red-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
        >
          <Trash2 size={14} strokeWidth={2.5} aria-hidden />
          {pending ? "Διαγραφή…" : "Διαγραφή επιλεγμένων"}
        </button>
      </div>
    </div>
  );
}
