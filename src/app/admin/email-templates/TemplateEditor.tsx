"use client";

import { useState, useTransition } from "react";
import { Save, RotateCcw, Send, Eye } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import {
  saveTemplateAction,
  revertTemplateAction,
  sendTestTemplateAction,
} from "./actions";

export function TemplateEditor({
  templateKey,
  description,
  initialSubject,
  initialBody,
  hasOverride,
  updatedAt,
}: {
  templateKey: string;
  description: string;
  initialSubject: string;
  initialBody: string;
  hasOverride: boolean;
  updatedAt: string | null;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [preview, setPreview] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [state, setState] = useState<{ ok?: boolean; msg?: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      {state?.msg && (
        <Alert tone={state.ok ? "success" : "danger"}>{state.msg}</Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Θέμα" htmlFor={`${templateKey}-subject`}>
          <Input
            id={`${templateKey}-subject`}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={500}
            placeholder="Θέμα email"
          />
        </Field>
        <Field label="Test send" htmlFor={`${templateKey}-test-email`}>
          <div className="flex gap-2">
            <Input
              id={`${templateKey}-test-email`}
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
            />
            <Button
              type="button"
              variant="secondary"
              size="md"
              icon={Send}
              disabled={pending || !testEmail || !subject || !body}
              onClick={() => {
                const fd = new FormData();
                fd.set("key", templateKey);
                fd.set("to", testEmail);
                fd.set("subject", subject);
                fd.set("bodyHtml", body);
                start(async () => {
                  const res = await sendTestTemplateAction(fd);
                  setState(
                    res.ok
                      ? {
                          ok: true,
                          msg: res.dryRun
                            ? "Dry-run — δεν στάλθηκε (δες Ρυθμίσεις email)."
                            : "Το test email στάλθηκε.",
                        }
                      : { ok: false, msg: res.error },
                  );
                });
              }}
            >
              Δοκιμή
            </Button>
          </div>
        </Field>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor={`${templateKey}-body`}
            className="text-sm font-semibold text-ink-900"
          >
            HTML περιεχόμενο
          </label>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="inline-flex items-center gap-1 text-xs font-bold text-brand-800 hover:text-brand-900"
          >
            <Eye size={12} />
            {preview ? "Επεξεργασία" : "Preview"}
          </button>
        </div>
        {preview ? (
          <div
            className="min-h-[300px] rounded-lg border-2 border-ink-300 bg-white p-4"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        ) : (
          <Textarea
            id={`${templateKey}-body`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
            className="font-mono text-xs"
            placeholder={`<p>Γεια σου {{name}},</p><p>...</p>`}
          />
        )}
        <p className="mt-1 text-xs text-ink-500">
          Χρησιμοποίησε placeholders της μορφής <code>{"{{name}}"}</code>,{" "}
          <code>{"{{url}}"}</code>, <code>{"{{code}}"}</code> — αντικαθίστανται
          στον χρόνο αποστολής.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-500">
          {hasOverride
            ? `Custom override · τελευταία ενημέρωση ${updatedAt ? new Date(updatedAt).toLocaleString("el-GR") : "—"}`
            : `Χρησιμοποιεί το default από τον κώδικα (${description}).`}
        </p>
        <div className="flex gap-2">
          {hasOverride && (
            <form action={revertTemplateAction}>
              <input type="hidden" name="key" value={templateKey} />
              <button
                type="submit"
                className="inline-flex h-11 items-center gap-2 rounded-lg border-2 border-red-700 bg-white px-4 text-sm font-bold text-red-700 hover:bg-red-50"
              >
                <RotateCcw size={14} strokeWidth={2.5} aria-hidden />
                Επαναφορά default
              </button>
            </form>
          )}
          <Button
            type="button"
            icon={Save}
            disabled={pending || !subject || !body}
            onClick={() => {
              const fd = new FormData();
              fd.set("key", templateKey);
              fd.set("description", description);
              fd.set("subject", subject);
              fd.set("bodyHtml", body);
              start(async () => {
                const res = await saveTemplateAction(fd);
                setState(
                  res.ok
                    ? { ok: true, msg: "Αποθηκεύτηκε." }
                    : { ok: false, msg: res.error },
                );
              });
            }}
          >
            {pending ? "Αποθήκευση..." : "Αποθήκευση"}
          </Button>
        </div>
      </div>
    </div>
  );
}
