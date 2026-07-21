"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { createPosTableAction, deletePosTableAction } from "./actions";

export function TableManager() {
  const [expanded, setExpanded] = useState(false);
  const [label, setLabel] = useState("");
  const [seats, setSeats] = useState("2");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTx] = useTransition();
  const router = useRouter();

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
      router.refresh();
    });
  }

  function remove(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    startTx(async () => {
      await deletePosTableAction(fd);
      router.refresh();
    });
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-sm font-semibold text-brand-800 hover:text-brand-900"
      >
        + Διαχείριση τραπεζιών
      </button>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-ink-200 bg-ink-50 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-500">
        Προσθήκη τραπεζιού
      </p>
      {error && (
        <p className="mb-2 rounded-md bg-red-50 p-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_auto]">
        <Field label="Ετικέτα" htmlFor="tbl-label">
          <Input
            id="tbl-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="π.χ. Τραπέζι 5"
            maxLength={60}
          />
        </Field>
        <Field label="Θέσεις" htmlFor="tbl-seats">
          <Input
            id="tbl-seats"
            type="number"
            min="1"
            max="30"
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
          />
        </Field>
        <div className="self-end">
          <Field label=" " htmlFor="tbl-add">
            <Button
              type="button"
              onClick={add}
              icon={Plus}
              disabled={pending || !label.trim()}
            >
              Προσθήκη
            </Button>
          </Field>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-ink-600 hover:text-ink-900"
        >
          Κλείσιμο
        </button>
      </div>
    </div>
  );
}
