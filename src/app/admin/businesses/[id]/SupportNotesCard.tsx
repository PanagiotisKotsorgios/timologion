"use client";

import { useState, useTransition } from "react";
import { Save, Tag as TagIcon } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { saveSupportNotesAction } from "./support-actions";

/**
 * Internal admin-only notes + tag chips for a business. Never surfaced
 * to the tenant. Tags are comma-separated on the DB side; we split for
 * display and rejoin on save. Auto-suggestions could go here later —
 * for now free-form.
 */
export function SupportNotesCard({
  businessId,
  initialNotes,
  initialTags,
}: {
  businessId: string;
  initialNotes: string | null;
  initialTags: string | null;
}) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [tags, setTags] = useState(initialTags ?? "");
  const [state, setState] = useState<{ error?: string; success?: string } | null>(
    null,
  );
  const [pending, start] = useTransition();

  const tagChips = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <Card>
      <CardHeader
        title="Σημειώσεις υποστήριξης (μόνο εσωτερικά)"
        subtitle="Ο πελάτης δεν βλέπει τίποτα από αυτά — VIP flags, escalation history, refund pending κ.λπ."
        action={<TagIcon size={18} className="text-ink-500" aria-hidden />}
      />
      <CardBody className="space-y-4">
        {state?.error && <Alert tone="danger">{state.error}</Alert>}
        {state?.success && <Alert tone="success">{state.success}</Alert>}

        <Field
          label="Tags"
          htmlFor="support-tags"
          help="Χωρισμένα με κόμμα. Παραδείγματα: vip, refund_pending, escalated, test_account."
        >
          <Input
            id="support-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            maxLength={500}
            placeholder="vip, refund_pending"
          />
        </Field>

        {tagChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tagChips.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full border-2 border-brand-300 bg-brand-50 px-3 py-0.5 text-[11px] font-black uppercase tracking-widest text-brand-900"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <Field
          label="Σημειώσεις"
          htmlFor="support-notes"
          help="Ελεύθερο κείμενο. Ό,τι θέλει η ομάδα υποστήριξης να θυμάται όταν χειρίζεται τον λογαριασμό."
        >
          <Textarea
            id="support-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="π.χ. Δεν χρεώνεται μέχρι 01/09/2026 λόγω onboarding delay. Επικοινώνησε με τον Γιώργο στο Μ. τμήμα."
          />
        </Field>

        <div className="flex justify-end">
          <Button
            type="button"
            icon={Save}
            disabled={pending}
            onClick={() => {
              const fd = new FormData();
              fd.set("businessId", businessId);
              fd.set("notes", notes);
              fd.set("tags", tags);
              start(async () => {
                const res = await saveSupportNotesAction(fd);
                setState(res);
              });
            }}
          >
            {pending ? "Αποθήκευση..." : "Αποθήκευση"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
