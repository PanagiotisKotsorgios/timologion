"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Field, Input } from "@/components/ui/Input";

/**
 * Simple URL-builder — no fancy client-side state, just an anchor that
 * hits /api/admin/reports/[id] with the chosen query params. The heavy
 * lifting is server-side.
 */
export function ReportRunner({
  reportId,
  needsBusiness,
  needsPeriod,
  needsYear,
}: {
  reportId: string;
  needsBusiness: boolean;
  needsPeriod: boolean;
  needsYear: boolean;
}) {
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth() + 1;
  const [businessId, setBusinessId] = useState("");
  const [from, setFrom] = useState(
    `${nowYear}-${String(nowMonth).padStart(2, "0")}-01`,
  );
  const [to, setTo] = useState(
    `${nowYear}-${String(nowMonth).padStart(2, "0")}-28`,
  );
  const [year, setYear] = useState(String(nowYear));

  const params = new URLSearchParams();
  if (needsBusiness && businessId) params.set("businessId", businessId);
  if (needsPeriod) {
    params.set("from", from);
    params.set("to", to);
  }
  if (needsYear) params.set("year", year);

  const canRun =
    (!needsBusiness || businessId.length > 0) &&
    (!needsPeriod || (from.length > 0 && to.length > 0)) &&
    (!needsYear || year.length === 4);

  const href = `/api/admin/reports/${reportId}?${params.toString()}`;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {needsBusiness && (
          <Field
            label="Business ID"
            htmlFor={`${reportId}-biz`}
            help="Από /admin/businesses/[id]"
          >
            <Input
              id={`${reportId}-biz`}
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              placeholder="cuid επιχείρησης"
            />
          </Field>
        )}
        {needsPeriod && (
          <>
            <Field label="Από" htmlFor={`${reportId}-from`}>
              <Input
                id={`${reportId}-from`}
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </Field>
            <Field label="Έως" htmlFor={`${reportId}-to`}>
              <Input
                id={`${reportId}-to`}
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </Field>
          </>
        )}
        {needsYear && (
          <Field label="Έτος" htmlFor={`${reportId}-year`}>
            <Input
              id={`${reportId}-year`}
              type="number"
              min={2020}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </Field>
        )}
      </div>
      <div className="flex justify-end">
        {canRun ? (
          <a
            href={href}
            className="inline-flex h-11 items-center gap-2 rounded-lg border-2 border-emerald-700 bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            <FileSpreadsheet size={14} strokeWidth={2.5} aria-hidden />
            Εξαγωγή XLSX
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex h-11 items-center gap-2 rounded-lg border-2 border-ink-300 bg-ink-100 px-4 text-sm font-bold text-ink-500"
          >
            <FileSpreadsheet size={14} strokeWidth={2.5} aria-hidden />
            Συμπλήρωσε τα πεδία
          </button>
        )}
      </div>
    </div>
  );
}
