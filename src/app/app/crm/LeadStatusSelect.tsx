"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { updateLeadStatusAction } from "./actions";

const OPTIONS = [
  { value: "new", label: "Νέος" },
  { value: "contacted", label: "Επαφή" },
  { value: "qualified", label: "Κατάλληλος" },
  { value: "disqualified", label: "Απορρίφθηκε" },
  { value: "converted", label: "Πελάτης" },
];

export function LeadStatusSelect({
  id,
  current,
  label,
  tone,
}: {
  id: string;
  current: string;
  label: string;
  tone: "brand" | "success" | "muted" | "warning" | "neutral";
}) {
  const router = useRouter();
  const [pending, startTx] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Badge tone={tone}>{label}</Badge>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const fd = new FormData();
          fd.set("id", id);
          fd.set("status", e.target.value);
          startTx(async () => {
            await updateLeadStatusAction(fd);
            router.refresh();
          });
        }}
        className="rounded-md border border-ink-300 bg-white px-2 py-1 text-xs"
        aria-label="Αλλαγή κατάστασης"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
