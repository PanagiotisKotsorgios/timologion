"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { openTicketAction } from "./actions";

export function NewTicketForm({
  defaultEmail,
  defaultName,
}: {
  defaultEmail: string;
  defaultName: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("3");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      {error && <Alert tone="danger">{error}</Alert>}
      <p className="text-xs text-ink-500">
        Θα απαντήσουμε στο <strong>{defaultEmail}</strong> (
        {defaultName || "χωρίς όνομα"}).
      </p>
      <Field label="Θέμα" htmlFor="tk-subject">
        <Input
          id="tk-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          maxLength={200}
          placeholder="π.χ. Δεν εκδίδεται παραστατικό"
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Κατηγορία" htmlFor="tk-cat">
          <Select
            id="tk-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="general">Γενικά</option>
            <option value="billing">Χρέωση</option>
            <option value="bug">Σφάλμα</option>
            <option value="feature">Πρόταση</option>
            <option value="wrapp">Wrapp / myDATA</option>
          </Select>
        </Field>
        <Field label="Προτεραιότητα" htmlFor="tk-prio">
          <Select
            id="tk-prio"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="3">Κανονική</option>
            <option value="2">Υψηλή</option>
            <option value="1">Επείγον</option>
            <option value="4">Χαμηλή</option>
          </Select>
        </Field>
      </div>
      <Field label="Περιγραφή" htmlFor="tk-body">
        <Textarea
          id="tk-body"
          rows={7}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          placeholder="Περίγραψέ μας το θέμα με όσες λεπτομέρειες μπορείς."
        />
      </Field>
      <div className="flex justify-end">
        <Button
          type="button"
          icon={Send}
          disabled={pending || !subject.trim() || !body.trim()}
          onClick={() => {
            setError(null);
            const fd = new FormData();
            fd.set("subject", subject);
            fd.set("body", body);
            fd.set("category", category);
            fd.set("priority", priority);
            start(async () => {
              const res = await openTicketAction(fd);
              if (res.ok) {
                router.push(`/app/support/${res.id}`);
              } else {
                setError(res.error);
              }
            });
          }}
        >
          {pending ? "Αποστολή..." : "Άνοιγμα ticket"}
        </Button>
      </div>
    </div>
  );
}
