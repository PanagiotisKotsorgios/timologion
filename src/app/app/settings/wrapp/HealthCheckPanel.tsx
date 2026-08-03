"use client";

import { useState, useTransition } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { runWrappHealthCheckAction } from "./actions";

type Data = Awaited<ReturnType<typeof runWrappHealthCheckAction>>;

/**
 * User-facing health check: hides all the endpoint names and returns
 * a single "όλα καλά" verdict or a short list of things to check.
 * Detailed step output is only for support staff — it's off by default.
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

  const failCount = data?.results.filter((r) => r.status === "fail").length ?? 0;
  const allOk =
    data != null &&
    failCount === 0 &&
    data.hasPlan &&
    data.canIssue;

  return (
    <Card>
      <CardHeader
        title="Έλεγχος σύνδεσης"
        subtitle="Επιβεβαίωσε ότι ο πάροχος myDATA είναι διαθέσιμος."
        action={
          <Button
            type="button"
            onClick={run}
            disabled={pending}
            icon={pending ? RefreshCw : Activity}
            className={pending ? "[&_svg]:animate-spin" : ""}
          >
            {pending ? "Έλεγχος..." : "Έλεγχος τώρα"}
          </Button>
        }
      />
      <CardBody className="space-y-4 p-6 md:p-8">
        {error && <Alert tone="danger">{error}</Alert>}

        {!data && !pending && (
          <p className="text-sm text-ink-700">
            Πάτα «Έλεγχος τώρα» για να δούμε αν όλα είναι εντάξει με τη
            σύνδεσή σου στον πάροχο myDATA.
          </p>
        )}

        {data && allOk && (
          <div className="flex items-start gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-emerald-700">
              <CheckCircle2 size={20} strokeWidth={2.5} aria-hidden />
            </div>
            <div>
              <p className="text-base font-black text-emerald-900">
                Όλα εντάξει
              </p>
              <p className="mt-1 text-sm text-emerald-900/80">
                Η σύνδεση είναι ενεργή, το πρόγραμμα ισχύει και μπορείς να
                εκδίδεις παραστατικά κανονικά.
              </p>
            </div>
          </div>
        )}

        {data && !allOk && (
          <div className="flex items-start gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-red-700">
              <XCircle size={20} strokeWidth={2.5} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-black text-red-900">
                Υπάρχει πρόβλημα
              </p>
              <ul className="mt-2 space-y-1 text-sm text-red-900/90">
                {!data.hasPlan && (
                  <li>· Δεν βρέθηκε ενεργό πρόγραμμα στον πάροχο.</li>
                )}
                {!data.canIssue && (
                  <li>
                    · Ο λογαριασμός σου στον πάροχο δεν έχει άδεια έκδοσης
                    παραστατικών.
                  </li>
                )}
                {failCount > 0 && (
                  <li>
                    · Απέτυχαν {failCount}{" "}
                    {failCount === 1 ? "έλεγχος" : "έλεγχοι"} σύνδεσης.
                  </li>
                )}
              </ul>
              <p className="mt-3 text-sm text-red-900/90">
                Επικοινώνησε με την υποστήριξη — έχουμε τα αναλυτικά και
                μπορούμε να το διορθώσουμε.
              </p>
            </div>
          </div>
        )}

        {data && data.hasStagingFallback && !data.hasApiKey && (
          <Alert tone="warning">
            Λειτουργείς σε δοκιμαστικό περιβάλλον. Πριν βγεις σε παραγωγή
            χρειάζεται να καταχωρηθεί το προσωπικό σου κλειδί.
          </Alert>
        )}
      </CardBody>
    </Card>
  );
}
