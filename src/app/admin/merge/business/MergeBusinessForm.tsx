"use client";

import { useState } from "react";
import { Merge } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Field, Input, Select } from "@/components/ui/Input";
import { mergeBusinessesAction } from "../actions";

/**
 * Winner picker + hidden loser list + typed "MERGE" confirmation.
 * The action does the heavy lifting; this form just gathers input.
 */
export function MergeBusinessForm({
  candidates,
}: {
  candidates: { id: string; label: string }[];
}) {
  const [winnerId, setWinnerId] = useState(candidates[0]?.id ?? "");
  const loserIds = candidates
    .filter((c) => c.id !== winnerId)
    .map((c) => c.id)
    .join(",");

  return (
    <form action={mergeBusinessesAction} className="space-y-4">
      <Alert tone="warning">
        Πληκτρολόγησε ακριβώς <code className="mono text-xs">MERGE</code> για να
        ενεργοποιηθεί το κουμπί.
      </Alert>

      <Field label="Winner (κρατείται)" htmlFor="mb-winner">
        <Select
          id="mb-winner"
          name="winnerId"
          value={winnerId}
          onChange={(e) => setWinnerId(e.target.value)}
        >
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>

      <input type="hidden" name="loserIds" value={loserIds} />

      <div className="rounded-lg border-2 border-red-300 bg-red-50 p-3 text-sm text-red-900">
        Θα διαγραφούν οι εξής IDs:{" "}
        <span className="mono font-bold">{loserIds || "(κανένας)"}</span>
      </div>

      <Field
        label="Confirmation"
        htmlFor="mb-confirm"
        help='Γράψε "MERGE" ώστε να ξέρουμε ότι το εννοείς.'
      >
        <Input id="mb-confirm" name="confirm" required placeholder="MERGE" />
      </Field>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex h-11 items-center gap-2 rounded-lg border-2 border-red-700 bg-red-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-red-700"
        >
          <Merge size={14} strokeWidth={2.5} aria-hidden />
          Merge τώρα
        </button>
      </div>
    </form>
  );
}
