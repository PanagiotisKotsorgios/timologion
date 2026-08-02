"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, PackagePlus } from "lucide-react";
import {
  QuickAddItemButton,
  type CreatedItemPayload,
} from "@/app/app/documents/QuickAddItemButton";
import { addTabItemAction } from "./actions";

type PosItem = {
  id: string;
  name: string;
  defaultPrice: string;
  vatRate: string;
};

/**
 * Client-side POS items grid. Adds two conveniences over the pure
 * server-rendered grid:
 *   1. Live search that filters the visible items as the user types
 *   2. Inline "Νέο είδος" QuickAdd — creates the item on the fly and
 *      pushes it straight into the tab without a page reload
 *
 * Both are essential for real POS use where an ad-hoc "μια σαλάτα
 * ελεύθερη" comes up mid-service and the counter operator can't
 * afford to leave the till.
 */
export function PosItemsGrid({
  tabId,
  initialItems,
  isClosed,
}: {
  tabId: string;
  initialItems: PosItem[];
  isClosed: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<PosItem[]>(initialItems);
  const [q, setQ] = useState("");
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [, startTx] = useTransition();

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((it) => it.name.toLowerCase().includes(query));
  }, [items, q]);

  function addToCart(item: PosItem) {
    if (isClosed) return;
    setBusyItemId(item.id);
    const fd = new FormData();
    fd.set("tabId", tabId);
    fd.set("itemId", item.id);
    fd.set("name", item.name);
    fd.set("quantity", "1");
    fd.set("unitPrice", item.defaultPrice);
    fd.set("vatRate", item.vatRate);
    startTx(async () => {
      await addTabItemAction(fd);
      setBusyItemId(null);
      router.refresh();
    });
  }

  function handleQuickCreated(created: CreatedItemPayload) {
    // Add to the local list so it appears in the grid immediately,
    // AND drop it straight into the cart — the whole point of a POS
    // quick-add is to skip the "now go find it" step.
    setItems((prev) => [
      ...prev,
      {
        id: created.id,
        name: created.name,
        defaultPrice: created.defaultPrice,
        vatRate: created.vatRate,
      },
    ]);
    addToCart({
      id: created.id,
      name: created.name,
      defaultPrice: created.defaultPrice,
      vatRate: created.vatRate,
    });
  }

  return (
    <div className="space-y-4">
      {/* Search + QuickAdd row. Search is compact on mobile, expands on sm+. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
            aria-hidden
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Αναζήτηση είδους..."
            disabled={isClosed}
            className="h-11 w-full rounded-lg border-2 border-ink-300 bg-white pl-9 pr-3 text-base text-ink-900 placeholder:text-ink-500 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:opacity-60"
          />
        </div>
        {!isClosed && (
          <QuickAddItemButton
            onCreated={handleQuickCreated}
            label="Νέο είδος"
          />
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-ink-300 bg-ink-50/40 p-8 text-center">
          <PackagePlus
            size={28}
            className="mx-auto text-ink-500"
            aria-hidden
          />
          {q ? (
            <>
              <p className="mt-3 text-sm text-ink-700">
                Δεν βρέθηκε είδος για «{q}».
              </p>
              {!isClosed && (
                <p className="mt-2 text-xs text-ink-500">
                  Πάτα «Νέο είδος» πάνω δεξιά για να το δημιουργήσεις
                  τώρα.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-ink-700">
                Δεν έχεις είδη ακόμα.
              </p>
              {!isClosed && (
                <p className="mt-2 text-xs text-ink-500">
                  Πάτα «Νέο είδος» για να προσθέσεις το πρώτο σου —
                  προστίθεται αυτόματα στο καλάθι.
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map((it) => {
            const busy = busyItemId === it.id;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => addToCart(it)}
                disabled={isClosed || busy}
                className="group relative overflow-hidden rounded-xl border-2 border-ink-200 bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-700 hover:bg-brand-50 hover:shadow-md disabled:opacity-60 disabled:hover:translate-y-0"
              >
                <p className="line-clamp-2 text-sm font-bold text-brand-900">
                  {it.name}
                </p>
                <p className="mt-1 text-sm font-black text-brand-700 tabular-nums">
                  €{it.defaultPrice}
                </p>
                {busy && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 animate-pulse bg-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
