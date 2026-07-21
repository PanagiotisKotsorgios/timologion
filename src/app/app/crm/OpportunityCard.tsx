"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  moveOpportunityStageAction,
  deleteOpportunityAction,
} from "./actions";

const nfEur = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const STAGES = [
  { value: "discovery", label: "Discovery" },
  { value: "proposal", label: "Πρόταση" },
  { value: "negotiation", label: "Διαπραγμ." },
  { value: "won", label: "Κερδισμένη" },
  { value: "lost", label: "Χαμένη" },
];

export function OpportunityCard({
  opportunity: o,
}: {
  opportunity: {
    id: string;
    title: string;
    amount: number;
    probability: number;
    stage: string;
    leadName: string | null;
  };
}) {
  const router = useRouter();
  const [pending, startTx] = useTransition();

  function move(stage: string) {
    const fd = new FormData();
    fd.set("id", o.id);
    fd.set("stage", stage);
    startTx(async () => {
      await moveOpportunityStageAction(fd);
      router.refresh();
    });
  }

  function remove() {
    if (!confirm(`Διαγραφή "${o.title}";`)) return;
    const fd = new FormData();
    fd.set("id", o.id);
    startTx(async () => {
      await deleteOpportunityAction(fd);
      router.refresh();
    });
  }

  return (
    <div
      className={
        "rounded-lg border-2 border-ink-200 bg-white p-2.5 shadow-sm " +
        (pending ? "opacity-60" : "")
      }
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 flex-1 text-sm font-semibold text-brand-900">
          {o.title}
        </p>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="text-ink-400 hover:text-red-700"
          aria-label="Διαγραφή"
        >
          <Trash2 size={12} />
        </button>
      </div>
      {o.leadName && (
        <p className="mt-1 text-[11px] text-ink-500">{o.leadName}</p>
      )}
      <div className="mt-2 flex items-center justify-between">
        <p className="text-sm font-bold text-brand-900">
          {nfEur.format(o.amount)}
        </p>
        <p className="text-[10px] font-bold text-ink-600">{o.probability}%</p>
      </div>
      <select
        value={o.stage}
        disabled={pending}
        onChange={(e) => move(e.target.value)}
        className="mt-2 w-full rounded-md border border-ink-300 bg-ink-50 px-1.5 py-1 text-[11px]"
        aria-label="Στάδιο"
      >
        {STAGES.map((s) => (
          <option key={s.value} value={s.value}>
            → {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
