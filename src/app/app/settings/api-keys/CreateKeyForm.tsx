"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Copy, Check } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { createApiKeyAction } from "./actions";

export function CreateKeyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState("");
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      {error && <Alert tone="danger">{error}</Alert>}
      {issued && (
        <Alert tone="success" title="Το κλειδί δημιουργήθηκε — αντέγραψέ το τώρα">
          <p className="mt-2">
            Δεν θα το δεις ξανά. Αν το χάσεις, revoke + δημιουργία νέου.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="mono flex-1 truncate rounded-md border border-emerald-300 bg-white px-3 py-2 text-xs">
              {issued}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(issued);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="inline-flex h-9 items-center gap-1 rounded-md border-2 border-emerald-700 bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "OK" : "Αντιγραφή"}
            </button>
          </div>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Όνομα"
          htmlFor="ak-name"
          help="π.χ. Zapier integration"
        >
          <Input
            id="ak-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
          />
        </Field>
        <Field
          label="Scopes (προαιρετικά)"
          htmlFor="ak-scopes"
          help="Comma-separated: documents.read, clients.write..."
        >
          <Input
            id="ak-scopes"
            value={scopes}
            onChange={(e) => setScopes(e.target.value)}
            maxLength={500}
            placeholder="documents.read, clients.read"
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          icon={KeyRound}
          disabled={pending || !name.trim()}
          onClick={() => {
            setError(null);
            setIssued(null);
            const fd = new FormData();
            fd.set("name", name);
            fd.set("scopes", scopes);
            start(async () => {
              const res = await createApiKeyAction(fd);
              if (res.ok) {
                setIssued(res.plaintext);
                setName("");
                setScopes("");
                router.refresh();
              } else {
                setError(res.error);
              }
            });
          }}
        >
          {pending ? "Δημιουργία..." : "Δημιουργία κλειδιού"}
        </Button>
      </div>
    </div>
  );
}
