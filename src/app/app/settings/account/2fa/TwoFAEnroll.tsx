"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QrCode, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import {
  startEnrollmentAction,
  confirmEnrollmentAction,
} from "./actions";

type Enrollment =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "shown";
      secret: string;
      otpauth: string;
      qr: string;
    }
  | { status: "confirmed" };

export function TwoFAEnroll() {
  const router = useRouter();
  const [state, setState] = useState<Enrollment>({ status: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [pending, startTx] = useTransition();

  function begin() {
    setError(null);
    setState({ status: "loading" });
    startTx(async () => {
      const res = await startEnrollmentAction();
      if (!res.ok) {
        setError(res.error);
        setState({ status: "idle" });
        return;
      }
      setState({
        status: "shown",
        secret: res.secret,
        otpauth: res.otpauth,
        qr: res.qr,
      });
    });
  }

  function confirm() {
    if (state.status !== "shown") return;
    setError(null);
    const fd = new FormData();
    fd.set("secret", state.secret);
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
          Ενεργοποιώντας το 2FA, θα σου ζητείται ένας 6-ψήφιος κωδικός από την
          εφαρμογή Authenticator κάθε φορά που συνδέεσαι.
        </p>
        <Button
          type="button"
          onClick={begin}
          icon={ShieldCheck}
          disabled={pending}
        >
          {pending ? "Παραγωγή κλειδιού..." : "Ενεργοποίηση 2FA"}
        </Button>
      </div>
    );
  }

  if (state.status === "loading") {
    return <p className="text-sm text-ink-700">Παραγωγή κλειδιού...</p>;
  }

  if (state.status === "confirmed") {
    return (
      <Alert tone="success" title="Ενεργοποιήθηκε">
        Το 2FA είναι πλέον ενεργό στον λογαριασμό σου.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {error && <Alert tone="danger">{error}</Alert>}

      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-ink-500">
          Βήμα 1 — Σκάναρε τον κωδικό QR
        </p>
        <div className="mt-3 flex flex-wrap items-start gap-6">
          <div className="rounded-2xl border-2 border-ink-200 bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.qr}
              alt="QR code για 2FA"
              className="h-40 w-40"
            />
          </div>
          <div className="flex-1 space-y-3">
            <p className="text-sm text-ink-700">
              Άνοιξε την εφαρμογή Authenticator και σκάναρε τον κωδικό. Εναλλακτικά
              πληκτρολόγησε χειροκίνητα το κλειδί:
            </p>
            <code className="block break-all rounded-lg border-2 border-ink-200 bg-ink-50 px-3 py-2 font-mono text-sm">
              {state.secret}
            </code>
          </div>
        </div>
      </div>

      <div className="border-t-2 border-ink-200 pt-6">
        <p className="text-sm font-bold uppercase tracking-widest text-ink-500">
          Βήμα 2 — Επιβεβαίωσε τον κωδικό
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Field label="Κωδικός 6 ψηφίων" htmlFor="totp-code">
            <Input
              id="totp-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="max-w-[180px] font-mono text-xl tracking-widest"
              placeholder="123456"
            />
          </Field>
          <Button
            type="button"
            onClick={confirm}
            icon={QrCode}
            disabled={pending || code.length !== 6}
          >
            {pending ? "Έλεγχος..." : "Ενεργοποίηση"}
          </Button>
        </div>
      </div>
    </div>
  );
}
