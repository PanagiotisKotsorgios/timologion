"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Wallet,
  CreditCard,
  Building2,
  X,
  Check,
  Save,
  Minus,
  Plus,
} from "lucide-react";
import { Field, Select } from "@/components/ui/Input";
import {
  closeTabAction,
  removeTabItemAction,
  cancelTabAction,
  setTabItemQuantityAction,
} from "./actions";

const nfEur = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});
const money = (n: number) => nfEur.format(n);

type CartItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
};

type Snapshot = {
  items: CartItem[];
  netTotal: number;
  vatTotal: number;
  total: number;
};

export function PosCart({
  tabId,
  initial,
  isClosed,
}: {
  tabId: string;
  initial: Snapshot;
  isClosed: boolean;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<
    "cash" | "card" | "bank_transfer" | "iris" | "other"
  >("cash");
  const [issueReceipt, setIssueReceipt] = useState(true);
  const [pending, startTx] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function removeItem(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    startTx(async () => {
      await removeTabItemAction(fd);
      router.refresh();
    });
  }

  function setQuantity(id: string, quantity: number) {
    const q = Math.max(0, Math.min(999, quantity));
    const fd = new FormData();
    fd.set("id", id);
    fd.set("quantity", String(q));
    startTx(async () => {
      await setTabItemQuantityAction(fd);
      router.refresh();
    });
  }

  function checkout() {
    setError(null);
    const fd = new FormData();
    fd.set("tabId", tabId);
    fd.set("paymentMethod", method);
    if (issueReceipt) fd.set("issueReceipt", "1");
    startTx(async () => {
      const res = await closeTabAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.documentId) {
        router.push(`/app/pos/${tabId}/receipt`);
      } else {
        router.push("/app/pos");
      }
    });
  }

  function cancelTab() {
    if (!confirm("Ακύρωση λογαριασμού;")) return;
    const fd = new FormData();
    fd.set("tabId", tabId);
    startTx(async () => {
      await cancelTabAction(fd);
      router.push("/app/pos");
    });
  }

  return (
    <div className="sticky top-6 space-y-4">
      <div className="rounded-2xl border-2 border-ink-300 bg-white shadow-card">
        <div className="border-b-2 border-ink-200 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-500">
            Καλάθι
          </p>
          <p className="mt-1 text-3xl font-extrabold text-brand-900">
            {money(initial.total)}
          </p>
        </div>

        {error && (
          <div className="border-b border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="max-h-96 overflow-y-auto">
          {initial.items.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink-500">
              Άδειο καλάθι. Πάτησε ένα είδος από αριστερά.
            </p>
          ) : (
            <ul className="divide-y divide-ink-200">
              {initial.items.map((it) => {
                const rowTotal =
                  it.quantity * it.unitPrice * (1 + it.vatRate / 100);
                return (
                  <li key={it.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {it.name}
                        </p>
                        <p className="text-xs text-ink-500">
                          {money(it.unitPrice)} · ΦΠΑ {it.vatRate}%
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-sm font-bold text-brand-900">
                        {money(rowTotal)}
                      </p>
                    </div>
                    {!isClosed && (
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {/* Quantity stepper — the whole reason this row is
                            two-line. Users don't have to re-click the item
                            grid to add another; they nudge here instead. */}
                        <div className="inline-flex items-stretch overflow-hidden rounded-lg border-2 border-ink-300 bg-white">
                          <button
                            type="button"
                            onClick={() => setQuantity(it.id, it.quantity - 1)}
                            disabled={pending}
                            className="grid h-8 w-8 place-items-center bg-ink-50 text-ink-700 transition-colors hover:bg-ink-100 disabled:opacity-50"
                            aria-label="Μείωση ποσότητας"
                          >
                            <Minus size={14} strokeWidth={2.5} />
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={999}
                            step={1}
                            value={it.quantity}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v))
                                setQuantity(it.id, Math.floor(v));
                            }}
                            disabled={pending}
                            className="h-8 w-12 border-x-2 border-ink-300 bg-white text-center text-sm font-bold tabular-nums text-ink-900 outline-none focus:bg-brand-50 [appearance:textfield] disabled:opacity-60 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            aria-label="Ποσότητα"
                          />
                          <button
                            type="button"
                            onClick={() => setQuantity(it.id, it.quantity + 1)}
                            disabled={pending}
                            className="grid h-8 w-8 place-items-center bg-ink-50 text-ink-700 transition-colors hover:bg-ink-100 disabled:opacity-50"
                            aria-label="Αύξηση ποσότητας"
                          >
                            <Plus size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(it.id)}
                          disabled={pending}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-ink-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                          aria-label="Αφαίρεση"
                        >
                          <Trash2 size={15} strokeWidth={2.25} />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-1 border-t-2 border-ink-200 bg-ink-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-700">Καθαρή αξία</span>
            <span className="font-semibold">{money(initial.netTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-700">ΦΠΑ</span>
            <span className="font-semibold">{money(initial.vatTotal)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-ink-200 pt-2 text-lg font-bold text-brand-900">
            <span>Σύνολο</span>
            <span>{money(initial.total)}</span>
          </div>
        </div>
      </div>

      {!isClosed && (
        <>
          <div className="rounded-2xl border-2 border-ink-300 bg-white p-4">
            <Field label="Τρόπος πληρωμής" htmlFor="pos-method">
              <Select
                id="pos-method"
                value={method}
                onChange={(e) =>
                  setMethod(e.target.value as typeof method)
                }
              >
                <option value="cash">Μετρητά</option>
                <option value="card">Κάρτα / Soft POS</option>
                <option value="iris">IRIS</option>
                <option value="bank_transfer">Τραπεζική</option>
                <option value="other">Άλλο</option>
              </Select>
            </Field>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={issueReceipt}
                onChange={(e) => setIssueReceipt(e.target.checked)}
                className="h-4 w-4 rounded border-ink-500 text-brand-700"
              />
              <span>Έκδοση απόδειξης λιανικής (πρόχειρη)</span>
            </label>
          </div>

          {/* Two-step action row per POS best practices: primary save
              (returns to /app/pos, tab stays open for later) + solid
              charge & close CTA. Cancel is demoted to a small red
              destructive button below. */}
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => router.push("/app/pos")}
              disabled={pending}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-ink-300 bg-white px-4 text-sm font-bold text-ink-900 shadow-sm transition-colors hover:border-ink-500 hover:bg-ink-100 disabled:opacity-60"
            >
              <Save size={16} strokeWidth={2.5} aria-hidden />
              Αποθήκευση
            </button>
            <button
              type="button"
              onClick={checkout}
              disabled={pending || initial.items.length === 0}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-emerald-800 bg-emerald-600 px-4 text-sm font-black text-white shadow-md transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {(() => {
                const Icon =
                  method === "card"
                    ? CreditCard
                    : method === "bank_transfer"
                      ? Building2
                      : Wallet;
                return <Icon size={16} strokeWidth={2.5} aria-hidden />;
              })()}
              {pending ? "Χρέωση..." : "Χρέωση & Κλείσιμο"}
            </button>
          </div>

          <button
            type="button"
            onClick={cancelTab}
            disabled={pending}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border-2 border-red-700 bg-red-600 px-4 text-xs font-bold uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            <X size={14} strokeWidth={3} aria-hidden />
            Ακύρωση λογαριασμού
          </button>
        </>
      )}

      {isClosed && (
        <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-4 text-center">
          <Check className="mx-auto text-green-700" size={32} />
          <p className="mt-2 font-semibold text-green-900">
            Ο λογαριασμός έχει κλείσει.
          </p>
        </div>
      )}
    </div>
  );
}
