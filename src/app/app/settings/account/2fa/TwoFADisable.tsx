"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, ShieldOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import { Alert } from "@/components/ui/Alert";
import { disable2faAction, requestDisableCodeAction } from "./actions";

export function TwoFADisable({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTx] = useTransition();

  function requestCode() {
    setError(null);
    startTx(async () => {
      const res = await requestDisableCodeAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCodeSent(true);
    });
  }

  function submit() {
    if (code.length !== 6) return;
    setError(null);
    const fd = new FormData();
    fd.set("password", password);
    fd.set("code", code);
    startTx(async () => {
      const res = await disable2faAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Alert tone="success" title="Το 2FA είναι ενεργό">
        <span className="inline-flex items-center gap-2">
          <ShieldCheck size={16} />
          Ο λογαριασμός σου προστατεύεται με 2FA μέσω email.
        </span>
      </Alert>

      <div className="border-t-2 border-ink-200 pt-4">
        <p className="text-sm font-bold uppercase tracking-widest text-ink-500">
          Απενεργοποίηση 2FA
        </p>
        <p className="mt-1 text-sm text-ink-700">
          Θα σου στείλουμε 6-ψήφιο κωδικό στα εισερχόμενά σου. Πληκτρολόγησέ
          τον μαζί με τον κωδικό σύνδεσής σου για να απενεργοποιήσεις το 2FA.
        </p>

        {error && (
          <div className="mt-3">
            <Alert tone="danger">{error}</Alert>
          </div>
        )}

        {!codeSent ? (
          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={requestCode}
              icon={Mail}
              disabled={pending}
            >
              {pending
                ? "Αποστολή..."
                : "Στείλε μου κωδικό επιβεβαίωσης"}
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <Alert tone="info">
              Σου στείλαμε 6-ψήφιο κωδικό. Ισχύει για 10 λεπτά.
            </Alert>
            {hasPassword && (
              <Field label="Κωδικός σύνδεσης" htmlFor="disable-pw" required>
                <PasswordField
                  id="disable-pw"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </Field>
            )}
            <Field label="Κωδικός 6 ψηφίων" htmlFor="disable-code" required>
              <Input
                id="disable-code"
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

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="danger"
                onClick={submit}
                icon={ShieldOff}
                disabled={pending || code.length !== 6}
              >
                {pending ? "Απενεργοποίηση..." : "Απενεργοποίηση 2FA"}
              </Button>
              <button
                type="button"
                onClick={requestCode}
                disabled={pending}
                className="text-sm font-bold text-brand-800 underline underline-offset-4 hover:text-brand-900 disabled:opacity-50"
              >
                Ξαναστείλε τον κωδικό
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
