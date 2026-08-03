"use client";

import { CheckCircle2, ExternalLink, Calendar } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";

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

/**
 * Read-only plan catalog. We used to run an in-app "change plan"
 * action that mutated local subscription state — but the actual
 * billing lives with the certified provider (Wrapp), and pretending
 * to bill from here would be misleading and non-compliant. Users
 * see their options and click through to Wrapp to actually change.
 */
export function ChangePlanForm({
  plans,
  currentPlanId,
}: {
  plans: Plan[];
  currentPlanId: string | null;
  currentCycle?: "monthly" | "yearly" | null;
}) {
  const wrappPlansUrl = "https://wrapp.ai/el/plans";

  return (
    <div className="space-y-6">
      <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-full border-2 border-brand-900/20 bg-brand-50 px-5 py-2.5 text-sm font-semibold text-brand-900">
        <Calendar size={14} aria-hidden />
        <span>Ετήσια χρέωση (συμπ. ΦΠΑ 24%)</span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = currentPlanId === p.id;
          const yearlyPrice = Number(p.priceYearly);
          const monthlyEquiv = yearlyPrice / 12;
          return (
            <div
              key={p.id}
              className={
                "flex flex-col rounded-2xl border-2 p-6 " +
                (isCurrent
                  ? "border-brand-900 bg-brand-50 shadow-soft"
                  : "border-ink-300 bg-white")
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
                  {fmt.format(yearlyPrice)}€
                </span>
                <span className="text-sm text-ink-500">/έτος</span>
              </p>
              <p className="mt-1 text-xs text-ink-500">
                Ισοδυναμεί με {fmt.format(monthlyEquiv)}€/μήνα
              </p>
              {p.features.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm">
                  {p.features.slice(0, 5).map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-ink-900"
                    >
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
            </div>
          );
        })}
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl text-sm text-ink-700">
            Η χρέωση της συνδρομής γίνεται απευθείας από τον πάροχο (Wrapp).
            Για αναβάθμιση, υποβάθμιση ή ακύρωση, χρησιμοποίησε τον
            λογαριασμό σου στη Wrapp.
          </p>
          <a
            href={wrappPlansUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-lg border-2 border-brand-800 bg-brand-700 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-800"
          >
            <ExternalLink size={14} strokeWidth={2.5} aria-hidden />
            Άλλαξε πακέτο στη Wrapp
          </a>
        </CardBody>
      </Card>
    </div>
  );
}
