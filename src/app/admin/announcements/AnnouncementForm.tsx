"use client";

import { useActionState } from "react";
import { Send, Save } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { saveAnnouncementAction, type AnnState } from "./actions";

type Initial = {
  id?: string;
  tone?: "info" | "warning" | "success";
  title?: string;
  body?: string;
  ctaHref?: string | null;
  ctaLabel?: string | null;
  publishedAt?: Date | null;
};

export function AnnouncementForm({ initial }: { initial?: Initial }) {
  const [state, formAction, pending] = useActionState<AnnState, FormData>(
    saveAnnouncementAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-8">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}

      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-6 md:grid-cols-3">
        <Field label="Τύπος" htmlFor="tone">
          <Select id="tone" name="tone" defaultValue={initial?.tone ?? "info"}>
            <option value="info">Ενημέρωση</option>
            <option value="warning">Προσοχή</option>
            <option value="success">Επιτυχία</option>
          </Select>
        </Field>
        <Field
          label="Τίτλος"
          htmlFor="title"
          className="md:col-span-2"
        >
          <Input
            id="title"
            name="title"
            defaultValue={initial?.title ?? ""}
            required
            maxLength={200}
            placeholder="π.χ. Νέα έκδοση με βελτιώσεις"
          />
        </Field>
      </div>

      <div>
        <label
          htmlFor="body"
          className="mb-2 block text-sm font-semibold text-ink-900"
        >
          Περιεχόμενο
        </label>
        <RichTextEditor
          name="body"
          initialHtml={initial?.body ?? ""}
          placeholder="Γράψε το περιεχόμενο της ανακοίνωσης..."
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Field
          label="Ετικέτα κουμπιού (CTA)"
          htmlFor="ctaLabel"
          hint="Προαιρετικό — εμφανίζεται ως σύνδεσμος."
        >
          <Input
            id="ctaLabel"
            name="ctaLabel"
            defaultValue={initial?.ctaLabel ?? ""}
            maxLength={80}
            placeholder="π.χ. Δείτε εδώ"
          />
        </Field>
        <Field label="URL κουμπιού" htmlFor="ctaHref">
          <Input
            id="ctaHref"
            name="ctaHref"
            defaultValue={initial?.ctaHref ?? ""}
            maxLength={300}
            placeholder="π.χ. /app/settings/aade"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-ink-300/60 pt-6">
        <label className="flex items-center gap-3 text-base font-semibold text-ink-900">
          <input
            type="checkbox"
            name="publish"
            defaultChecked={Boolean(initial?.publishedAt)}
            className="h-5 w-5 rounded border-2 border-ink-500 text-brand-700"
          />
          Δημοσίευση σε όλους τους χρήστες
        </label>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          icon={initial?.publishedAt ? Save : Send}
        >
          {pending
            ? "Αποθήκευση..."
            : initial?.id
              ? "Αποθήκευση"
              : "Δημιουργία ανακοίνωσης"}
        </Button>
      </div>
    </form>
  );
}
