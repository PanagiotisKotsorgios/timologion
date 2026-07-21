"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Wallet, CreditCard, Building2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Input";
import { closeTabAction, removeTabItemAction, cancelTabAction } from "./actions";

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
                const rowTotal = it.quantity * it.unitPrice * (1 + it.vatRate / 100);
                return (
                  <li
                    key={it.id}
                    className="flex items-center justify-between gap-2 p-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-ink-900">
                        {it.name}
                      </p>
                      <p className="text-xs text-ink-500">
                        {it.quantity} × {money(it.unitPrice)} · ΦΠΑ{" "}
                        {it.vatRate}%
                      </p>
                    </div>
                    <p className="text-sm font-bold text-brand-900">
                      {money(rowTotal)}
                    </p>
                    {!isClosed && (
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        className="text-ink-500 hover:text-red-700"
                        aria-label="Αφαίρεση"
                      >
                        <Trash2 size={16} />
                      </button>
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

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={cancelTab}
              disabled={pending}
              icon={X}
            >
              Ακύρωση
            </Button>
            <Button
              type="button"
              onClick={checkout}
              disabled={pending || initial.items.length === 0}
              icon={
                method === "card"
                  ? CreditCard
                  : method === "bank_transfer"
                    ? Building2
                    : Wallet
              }
              className="flex-1"
            >
              {pending ? "Χρέωση..." : "Χρέωση & Κλείσιμο"}
            </Button>
          </div>
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
