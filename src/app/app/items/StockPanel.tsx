"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PackagePlus, PackageMinus, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Field } from "@/components/ui/Input";
import { recordStockMovementAction } from "./actions";

export function StockPanel({
  itemId,
  currentStock,
  unit,
}: {
  itemId: string;
  currentStock: number | null;
  unit: string;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"in" | "out" | "adjustment">("in");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTx] = useTransition();

  function submit() {
    setError(null);
    const fd = new FormData();
    fd.set("itemId", itemId);
    fd.set("kind", kind);
    fd.set("quantity", quantity);
    fd.set("reason", reason);
    startTx(async () => {
      const res = await recordStockMovementAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setQuantity("1");
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-brand-100 bg-brand-50 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-700">
          Τρέχον απόθεμα
        </p>
        <p className="mt-1 text-3xl font-extrabold text-brand-900">
          {currentStock ?? "—"}{" "}
          <span className="text-base font-medium text-ink-700">{unit}</span>
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 p-2 text-sm text-red-800">{error}</p>
      )}

      <Field label="Κίνηση" htmlFor="kind">
        <Select
          id="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
        >
          <option value="in">Εισαγωγή (+)</option>
          <option value="out">Έξοδος (−)</option>
          <option value="adjustment">Απογραφή (ορίζεις σύνολο)</option>
        </Select>
      </Field>

      <Field
        label={
          kind === "adjustment" ? "Νέο σύνολο αποθέματος" : "Ποσότητα"
        }
        htmlFor="quantity"
      >
        <Input
          id="quantity"
          type="number"
          step="0.001"
          min="0.001"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </Field>

      <Field label="Αιτία / σημείωση" htmlFor="reason">
        <Input
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={200}
          placeholder="π.χ. παραλαβή προμηθευτή"
        />
      </Field>

      <Button
        type="button"
        onClick={submit}
        disabled={pending || !Number(quantity)}
        icon={
          kind === "in" ? PackagePlus : kind === "out" ? PackageMinus : RefreshCcw
        }
      >
        {pending ? "Καταχώρηση..." : "Καταχώρηση"}
      </Button>
    </div>
  );
}
