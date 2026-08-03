"use client";

import { useActionState, useState } from "react";
import { Send, TestTube2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { sendBroadcastAction, type BroadcastState } from "./actions";

const SEGMENT_LABELS: Record<string, string> = {
  all_users: "Όλοι οι χρήστες",
  owners: "Owners επιχειρήσεων",
  admins: "Platform admins",
  paying_owners: "Owners με ενεργή συνδρομή",
  free_users: "Users χωρίς συνδρομή",
};

export function BroadcastForm({
  segmentCounts,
}: {
  segmentCounts: Record<string, number>;
}) {
  const [segment, setSegment] = useState("owners");
  const [dryRun, setDryRun] = useState(true);
  const [state, formAction, pending] = useActionState<BroadcastState, FormData>(
    sendBroadcastAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.ok === false && <Alert tone="danger">{state.error}</Alert>}
      {state?.ok === true && (
        <Alert tone={state.dryRun ? "info" : "success"}>
          {state.dryRun
            ? `Dry-run: ${state.recipients.toLocaleString("el-GR")} παραλήπτες θα λάμβαναν το email.`
            : `Στάλθηκε σε ${state.sent}/${state.recipients} · ${state.failed} απέτυχαν.`}
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Segment"
          htmlFor="bc-segment"
          help={`Παραλήπτες: ${(segmentCounts[segment] ?? 0).toLocaleString("el-GR")}`}
        >
          <Select
            id="bc-segment"
            name="segment"
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
          >
            {Object.entries(SEGMENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v} · {(segmentCounts[k] ?? 0).toLocaleString("el-GR")}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Θέμα" htmlFor="bc-subject">
          <Input
            id="bc-subject"
            name="subject"
            required
            maxLength={200}
            placeholder="π.χ. Νέα δυνατότητα: αυτόματη ΑΦΜ αναζήτηση"
          />
        </Field>
      </div>

      <Field
        label="HTML περιεχόμενο"
        htmlFor="bc-body"
        help="Απλό HTML — inline CSS συνιστάται για συμβατότητα με email clients."
      >
        <Textarea
          id="bc-body"
          name="bodyHtml"
          required
          rows={12}
          className="font-mono text-xs"
          placeholder="<p>Γεια σου {{name}},</p><p>...</p>"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="dryRun"
          value="1"
          checked={dryRun}
          onChange={(e) => setDryRun(e.target.checked)}
          className="h-4 w-4 rounded border-ink-500 text-brand-700"
        />
        <span className="font-semibold">
          Dry-run — μόνο μέτρημα παραληπτών, δεν στέλνει
        </span>
      </label>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={pending}
          icon={dryRun ? TestTube2 : Send}
          variant={dryRun ? "secondary" : "primary"}
        >
          {pending
            ? "Αποστολή..."
            : dryRun
              ? "Δοκιμαστικό μέτρημα"
              : "Αποστολή τώρα"}
        </Button>
      </div>
    </form>
  );
}
