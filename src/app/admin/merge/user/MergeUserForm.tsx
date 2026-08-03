"use client";

import { useState } from "react";
import { Merge } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Field, Input, Select } from "@/components/ui/Input";
import { mergeUsersAction } from "../actions";

export function MergeUserForm({
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
    <form action={mergeUsersAction} className="space-y-4">
      <Alert tone="warning">
        Πληκτρολόγησε <code className="mono text-xs">MERGE</code> για να
        ενεργοποιηθεί το κουμπί.
      </Alert>

      <Field label="Winner (κρατείται)" htmlFor="mu-winner">
        <Select
          id="mu-winner"
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

      <Field label="Confirmation" htmlFor="mu-confirm">
        <Input id="mu-confirm" name="confirm" required placeholder="MERGE" />
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
