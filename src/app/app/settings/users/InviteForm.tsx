"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { t } from "@/lib/i18n";
import { ROLE_OPTIONS_EL } from "@/lib/roles";
import { inviteMemberAction, type UserActionState } from "./actions";

export function InviteForm() {
  const [state, formAction, pending] = useActionState<
    UserActionState,
    FormData
  >(inviteMemberAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label={t.auth.email}
          htmlFor="invite-email"
          className="md:col-span-2"
          help="Το email του συνεργάτη που θες να προσκαλέσεις. Αν δεν έχει ήδη λογαριασμό στο timologion, θα δημιουργηθεί όταν συνδεθεί για πρώτη φορά."
        >
          <Input id="invite-email" name="email" type="email" required />
        </Field>
        <Field
          label="Ρόλος"
          htmlFor="invite-role"
          help="Ιδιοκτήτης: πλήρη δικαιώματα + οικονομικά. Διαχειριστής: όλα εκτός διαγραφής επιχείρησης. Λογιστής: παραστατικά + αναφορές. Πωλήσεις: πελάτες + πωλήσεις. Υπάλληλος: βασική έκδοση. Ανάγνωση μόνο: read-only."
        >
          <Select id="invite-role" name="role" defaultValue="staff">
            {ROLE_OPTIONS_EL.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? t.common.loading : "Προσθήκη"}
        </Button>
      </div>
    </form>
  );
}
