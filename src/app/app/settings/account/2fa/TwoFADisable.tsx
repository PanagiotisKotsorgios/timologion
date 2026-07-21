"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import { Alert } from "@/components/ui/Alert";
import { disable2faAction } from "./actions";

export function TwoFADisable({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTx] = useTransition();

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
          Ο λογαριασμός σου προστατεύεται με 2FA.
        </span>
      </Alert>

      <div className="border-t-2 border-ink-200 pt-4">
        <p className="text-sm font-bold uppercase tracking-widest text-ink-500">
          Απενεργοποίηση 2FA
        </p>
        <p className="mt-1 text-sm text-ink-700">
          Επιβεβαίωσε τον κωδικό σου και έναν 6-ψήφιο κωδικό από την εφαρμογή
          Authenticator.
        </p>

        {error && (
          <div className="mt-3">
            <Alert tone="danger">{error}</Alert>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {hasPassword && (
            <Field label="Κωδικός σύνδεσης" htmlFor="disable-pw">
              <PasswordField
                id="disable-pw"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
          )}
          <Field label="Κωδικός 6 ψηφίων" htmlFor="disable-code">
            <Input
              id="disable-code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="max-w-[180px] font-mono text-xl tracking-widest"
              placeholder="123456"
            />
          </Field>

          <Button
            type="button"
            variant="danger"
            onClick={submit}
            icon={ShieldOff}
            disabled={pending || code.length !== 6}
          >
            {pending ? "Απενεργοποίηση..." : "Απενεργοποίηση 2FA"}
          </Button>
        </div>
      </div>
    </div>
  );
}
