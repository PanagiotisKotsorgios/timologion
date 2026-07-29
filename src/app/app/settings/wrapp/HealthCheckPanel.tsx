"use client";

import { useState, useTransition } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  MinusCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import {
  runWrappHealthCheckAction,
  type HealthCheckResult,
} from "./actions";

type Data = Awaited<ReturnType<typeof runWrappHealthCheckAction>>;

/**
 * Diagnostic panel that runs the Wrapp read-only endpoints one after
 * another and shows a per-step pass/fail/skip. Meant for the "am I
 * actually connected right now?" moment during manual staging tests —
 * one click covers everything the invoice flow depends on.
 */
export function HealthCheckPanel() {
  const [pending, startTx] = useTransition();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTx(async () => {
      try {
        const res = await runWrappHealthCheckAction();
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  const summary = data
    ? {
        pass: data.results.filter((r) => r.status === "pass").length,
        fail: data.results.filter((r) => r.status === "fail").length,
        skip: data.results.filter((r) => r.status === "skip").length,
      }
    : null;

  return (
    <Card>
      <CardHeader
        title="Έλεγχος υγείας Wrapp"
        subtitle="Πάτα «Εκτέλεση» για να ελέγξεις κάθε endpoint που χρησιμοποιεί η έκδοση παραστατικών."
        action={
          <Button
            type="button"
            onClick={run}
            disabled={pending}
            icon={pending ? RefreshCw : Activity}
            className={pending ? "[&_svg]:animate-spin" : ""}
          >
            {pending ? "Εκτέλεση..." : "Εκτέλεση ελέγχου"}
          </Button>
        }
      />
      <CardBody className="space-y-4 p-6 md:p-8">
        {error && <Alert tone="danger">{error}</Alert>}

        {!data && !pending && (
          <p className="text-sm text-ink-700">
            Ο έλεγχος καλεί σε σειρά:{" "}
            <span className="mono">/tenant_details</span>,{" "}
            <span className="mono">/branches</span>,{" "}
            <span className="mono">/billing_books</span>,{" "}
            <span className="mono">/vat_search</span>,{" "}
            <span className="mono">/invoices/issued_count</span>. Επιστρέφει το
            HTTP status και το σφάλμα ανά endpoint — έτσι βλέπεις άμεσα αν κάτι
            είναι λάθος στη σύνδεση.
          </p>
        )}

        {data && (
          <>
            <div className="grid gap-3 rounded-2xl border-2 border-ink-200 bg-brand-50/40 p-4 md:grid-cols-4">
              <Stat label="Base URL" value={data.baseUrl} mono />
              <Stat
                label="Επιτυχή / Αποτυχία"
                value={`${summary?.pass ?? 0} / ${summary?.fail ?? 0}${
                  summary?.skip ? " (παράλειψη: " + summary.skip + ")" : ""
                }`}
                tone={
                  (summary?.fail ?? 0) === 0
                    ? "success"
                    : (summary?.pass ?? 0) === 0
                      ? "danger"
                      : "warning"
                }
              />
              <Stat
                label="Πρόγραμμα ενεργό"
                value={data.hasPlan ? "Ναι" : "Όχι"}
                tone={data.hasPlan ? "success" : "danger"}
              />
              <Stat
                label="Άδεια έκδοσης"
                value={data.canIssue ? "Ναι" : "Όχι"}
                tone={data.canIssue ? "success" : "danger"}
              />
            </div>

            {data.hasStagingFallback && !data.hasApiKey && (
              <Alert tone="warning">
                Λειτουργεί με το staging fallback — δεν έχει καταχωρηθεί
                προσωπικό api_key για αυτήν την επιχείρηση. Αυτό είναι OK για
                staging tests, αλλά όχι για παραγωγή.
              </Alert>
            )}

            <ol className="space-y-3">
              {data.results.map((r, i) => (
                <StepRow key={i} r={r} index={i + 1} />
              ))}
            </ol>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function StepRow({ r, index }: { r: HealthCheckResult; index: number }) {
  const meta =
    r.status === "pass"
      ? {
          icon: CheckCircle2,
          bg: "bg-green-50",
          border: "border-green-300",
          text: "text-green-800",
        }
      : r.status === "fail"
        ? {
            icon: XCircle,
            bg: "bg-red-50",
            border: "border-red-300",
            text: "text-red-800",
          }
        : {
            icon: MinusCircle,
            bg: "bg-ink-100",
            border: "border-ink-300",
            text: "text-ink-700",
          };
  const Icon = meta.icon;
  return (
    <li
      className={`flex items-start gap-3 rounded-xl border-2 ${meta.border} ${meta.bg} p-4`}
    >
      <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white ${meta.text}`}>
        <Icon size={16} strokeWidth={2.5} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink-900">
          <span className="mr-2 text-ink-500">#{index}</span>
          {r.step}
        </p>
        {r.detail && (
          <p className={`mt-1 break-words text-sm ${meta.text}`}>{r.detail}</p>
        )}
        {r.extra && (
          <p className="mt-1 break-words text-xs text-ink-700">{r.extra}</p>
        )}
      </div>
    </li>
  );
}

function Stat({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "danger";
  mono?: boolean;
}) {
  const toneClass =
    tone === "success"
      ? "text-green-800"
      : tone === "warning"
        ? "text-amber-800"
        : tone === "danger"
          ? "text-red-800"
          : "text-brand-900";
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-ink-500">
        {label}
      </p>
      <p
        className={`mt-1 break-words text-sm font-extrabold ${toneClass} ${mono ? "mono" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
