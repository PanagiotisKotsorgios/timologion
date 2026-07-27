"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import {
  startEnrollmentAction,
  confirmEnrollmentAction,
} from "./actions";

type Enrollment =
  | { status: "idle" }
  | { status: "code_sent" }
  | { status: "confirmed" };

export function TwoFAEnroll() {
  const router = useRouter();
  const [state, setState] = useState<Enrollment>({ status: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [pending, startTx] = useTransition();

  function requestCode() {
    setError(null);
    startTx(async () => {
      const res = await startEnrollmentAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setState({ status: "code_sent" });
    });
  }

  function confirm() {
    if (state.status !== "code_sent") return;
    setError(null);
    const fd = new FormData();
    fd.set("code", code);
    startTx(async () => {
      const res = await confirmEnrollmentAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setState({ status: "confirmed" });
      router.refresh();
    });
  }

  if (state.status === "idle") {
    return (
      <div className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <p className="text-sm text-ink-700">
          Ενεργοποιώντας το 2FA, κάθε φορά που συνδέεσαι θα σου στέλνουμε
          έναν 6-ψήφιο κωδικό στο email σου. Χρειάζεσαι πρόσβαση στα
          εισερχόμενά σου για να ολοκληρώσεις τη σύνδεση.
        </p>
        <Button
          type="button"
          onClick={requestCode}
          icon={Mail}
          disabled={pending}
        >
          {pending
            ? "Αποστολή κωδικού..."
            : "Στείλε μου κωδικό στο email"}
        </Button>
      </div>
    );
  }

  if (state.status === "confirmed") {
    return (
      <Alert tone="success" title="Ενεργοποιήθηκε">
        Το 2FA είναι πλέον ενεργό. Την επόμενη φορά που θα συνδεθείς θα σου
        στείλουμε έναν κωδικό στο email σου.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert tone="info">
        Σου στείλαμε έναν 6-ψήφιο κωδικό στα εισερχόμενά σου. Λήγει σε 10
        λεπτά.
      </Alert>

      {error && <Alert tone="danger">{error}</Alert>}

      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-ink-500">
          Πληκτρολόγησε τον κωδικό
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Field label="Κωδικός 6 ψηφίων" htmlFor="mfa-code" required>
            <Input
              id="mfa-code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="max-w-[200px] font-mono text-2xl tracking-[.35em]"
              placeholder="000000"
            />
          </Field>
          <Button
            type="button"
            onClick={confirm}
            icon={ShieldCheck}
            disabled={pending || code.length !== 6}
          >
            {pending ? "Έλεγχος..." : "Ενεργοποίηση"}
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={requestCode}
        disabled={pending}
        className="text-sm font-bold text-brand-800 underline underline-offset-4 hover:text-brand-900 disabled:opacity-50"
      >
        Ξαναστείλε τον κωδικό
      </button>
    </div>
  );
}
