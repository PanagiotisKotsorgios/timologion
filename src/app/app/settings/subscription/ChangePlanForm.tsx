"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ArrowRightLeft } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { changePlanAction } from "./actions";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: string;
  priceYearly: string;
  features: string[];
};

const fmt = new Intl.NumberFormat("el-GR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function ChangePlanForm({
  plans,
  currentPlanId,
  currentCycle,
}: {
  plans: Plan[];
  currentPlanId: string | null;
  currentCycle: "monthly" | "yearly" | null;
}) {
  const [yearly, setYearly] = useState<boolean>(currentCycle !== "monthly");
  const [selected, setSelected] = useState<string | null>(currentPlanId);
  const [state, setState] = useState<{
    error?: string;
    success?: string;
  } | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    if (!selected) return;
    const fd = new FormData();
    fd.set("planId", selected);
    fd.set("billingCycle", yearly ? "yearly" : "monthly");
    start(async () => {
      const res = await changePlanAction(undefined, fd);
      setState(res ?? {});
    });
  };

  return (
    <div className="space-y-6">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}

      {/* Cycle toggle */}
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-full border-2 border-brand-900/20 bg-white p-1">
          <button
            type="button"
            onClick={() => setYearly(false)}
            className={
              "rounded-full px-6 py-2 text-sm font-bold transition-colors " +
              (!yearly
                ? "bg-brand-900 text-white"
                : "text-brand-900/60 hover:text-brand-900")
            }
          >
            Μηνιαία
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className={
              "flex items-center gap-2 rounded-full px-6 py-2 text-sm font-bold transition-colors " +
              (yearly
                ? "bg-brand-900 text-white"
                : "text-brand-900/60 hover:text-brand-900")
            }
          >
            Ετήσια
            <span
              className={
                "rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest " +
                (yearly
                  ? "bg-emerald-400 text-emerald-950"
                  : "bg-emerald-100 text-emerald-800")
              }
            >
              −25%
            </span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const isSelected = selected === p.id;
          const isCurrent = currentPlanId === p.id;
          const price = yearly
            ? Number(p.priceYearly) / 12
            : Number(p.priceMonthly);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={
                "flex flex-col rounded-2xl border-2 p-6 text-left transition-all " +
                (isSelected
                  ? "border-brand-900 bg-brand-50 shadow-soft"
                  : "border-ink-300 bg-white hover:border-brand-500")
              }
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-brand-900">{p.name}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-800">
                    Ενεργό
                  </span>
                )}
              </div>
              {p.description && (
                <p className="mt-1 text-sm text-ink-700">{p.description}</p>
              )}
              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-brand-900">
                  {fmt.format(price)}€
                </span>
                <span className="text-sm text-ink-500">/μήνα</span>
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {yearly
                  ? `Χρέωση ${fmt.format(Number(p.priceYearly))}€ ετησίως`
                  : "Χωρίς δέσμευση"}
              </p>
              {p.features.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm">
                  {p.features.slice(0, 5).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-ink-900">
                      <CheckCircle2
                        size={14}
                        className="mt-0.5 shrink-0 text-emerald-600"
                        aria-hidden
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </button>
          );
        })}
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-ink-700">
            {selected
              ? "Η αλλαγή εφαρμόζεται άμεσα και δημιουργεί νέα περίοδο χρέωσης."
              : "Επίλεξε ένα πακέτο για να συνεχίσεις."}
          </p>
          <Button
            type="button"
            disabled={!selected || pending || selected === currentPlanId}
            onClick={submit}
            icon={ArrowRightLeft}
          >
            {pending ? "Αλλαγή..." : "Αλλαγή πακέτου"}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
