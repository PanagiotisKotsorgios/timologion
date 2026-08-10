"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { todayInAthens } from "@/lib/date";
import { recordExpensePaymentAction } from "./actions";

/**
 * Opens the "Νέα πληρωμή" (expense-payment) form in a modal. Mirrors
 * NewPaymentButton on the receipts side so the whole app has one
 * consistent record-payment gesture.
 */
export function RecordExpensePaymentButton({
  expenseId,
  supplierId,
  outstanding,
}: {
  expenseId?: string;
  supplierId?: string;
  outstanding?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        icon={Plus}
        size="md"
      >
        Νέα πληρωμή
      </Button>
      {open && (
        <PaymentModal
          expenseId={expenseId}
          supplierId={supplierId}
          outstanding={outstanding}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function PaymentModal({
  expenseId,
  supplierId,
  outstanding,
  onClose,
}: {
  expenseId?: string;
  supplierId?: string;
  outstanding?: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(
    outstanding && outstanding > 0 ? String(outstanding.toFixed(2)) : "",
  );
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(todayInAthens());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTx] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function submit() {
    if (!amount) return;
    setError(null);
    const fd = new FormData();
    if (expenseId) fd.set("expenseId", expenseId);
    if (supplierId) fd.set("supplierId", supplierId);
    fd.set("amount", amount);
    fd.set("method", method);
    fd.set("reference", reference);
    fd.set("notes", notes);
    fd.set("paidAt", paidAt);
    startTx(async () => {
      const res = await recordExpensePaymentAction(undefined, fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-expense-payment-title"
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 py-10 sm:p-8"
    >
      <button
        type="button"
        aria-label="Κλείσιμο"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-ink-300/70 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-ink-300/60 px-8 py-6">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-800">
              <Wallet size={22} aria-hidden />
            </div>
            <div>
              <h2
                id="new-expense-payment-title"
                className="text-2xl font-extrabold text-brand-900 md:text-3xl"
              >
                Νέα πληρωμή προμηθευτή
              </h2>
              <p className="mt-1 text-sm text-ink-700">
                Κατέγραψε πληρωμή σε έξοδο ή προμηθευτή.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Κλείσιμο"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 px-8 py-6">
          {error && <Alert tone="danger">{error}</Alert>}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Ημ/νία πληρωμής" htmlFor="paidAt" required>
              <Input
                id="paidAt"
                type="date"
                required
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </Field>
            <Field label="Ποσό (€)" htmlFor="amount" required>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </Field>
            <Field label="Μέθοδος" htmlFor="method" required>
              <Select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="bank_transfer">Τραπεζική μεταφορά</option>
                <option value="cash">Μετρητά</option>
                <option value="card">Κάρτα</option>
                <option value="iris">IRIS</option>
                <option value="check">Επιταγή</option>
                <option value="credit">Επί πιστώσει</option>
                <option value="other">Άλλο</option>
              </Select>
            </Field>
            <Field label="Αναφορά / αρ. εντολής" htmlFor="reference">
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={160}
                placeholder="π.χ. εντολή SEPA #1234"
              />
            </Field>
          </div>
          <Field label="Σημειώσεις" htmlFor="pay-notes">
            <Textarea
              id="pay-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={pending}
            >
              Άκυρο
            </Button>
            <Button
              type="button"
              onClick={submit}
              icon={Plus}
              disabled={pending || !amount}
            >
              {pending ? "Καταχώρηση..." : "Καταχώρηση"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
