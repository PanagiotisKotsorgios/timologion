"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { openTabAction } from "./actions";

export function NewTabButton() {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [pending, startTx] = useTransition();
  const router = useRouter();

  function submit() {
    const fd = new FormData();
    fd.set("label", label);
    startTx(async () => {
      const res = await openTabAction(fd);
      if (res.ok) {
        router.push(`/app/pos/${res.id}`);
      }
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} icon={Plus}>
        Νέος λογαριασμός
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border-2 border-ink-300 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-brand-900">
              Νέος λογαριασμός πάγκου
            </h2>
            <p className="mt-1 text-sm text-ink-700">
              Χωρίς τραπέζι — για γρήγορη πώληση.
            </p>
            <div className="mt-4">
              <Field label="Ετικέτα (προαιρετικό)" htmlFor="label">
                <Input
                  id="label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={80}
                  placeholder="π.χ. Ταμείο 1"
                />
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Ακύρωση
              </Button>
              <Button type="button" onClick={submit} disabled={pending}>
                {pending ? "Άνοιγμα..." : "Άνοιγμα"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
