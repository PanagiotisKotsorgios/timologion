"use client";

import { Field, Input, Select } from "@/components/ui/Input";
import { t } from "@/lib/i18n";
import { ROLE_OPTIONS_EL } from "@/lib/roles";

/**
 * Invite form is BLOCKED while multi-user is in beta.
 *
 * The fields render so admins can see what the future flow will look
 * like (email + role picker), but the submit button is disabled with
 * `cursor-not-allowed` and a tooltip explaining why. The old
 * useActionState + inviteMemberAction wiring is removed — nothing
 * calls it while the feature is off. Re-enable by restoring the
 * original form (see git history around commit d91a978) and dropping
 * the beta banner in ../page.tsx.
 */
export function InviteForm() {
  const blockedReason =
    "Η προσθήκη συνεργατών είναι σε φάση δοκιμών (beta) — δεν λειτουργεί ακόμα. Έρχεται σύντομα.";
  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label={t.auth.email}
          htmlFor="invite-email"
          className="md:col-span-2"
          help="Το email του συνεργάτη που θες να προσκαλέσεις. Ο συνεργάτης πρέπει να έχει ήδη λογαριασμό στο timologion."
        >
          <Input
            id="invite-email"
            name="email"
            type="email"
            disabled
            aria-disabled="true"
            title={blockedReason}
            className="cursor-not-allowed opacity-70"
          />
        </Field>
        <Field
          label="Ρόλος"
          htmlFor="invite-role"
          help="Ιδιοκτήτης: πλήρη δικαιώματα + οικονομικά. Διαχειριστής: όλα εκτός διαγραφής επιχείρησης. Λογιστής: παραστατικά + αναφορές. Πωλήσεις: πελάτες + πωλήσεις. Υπάλληλος: βασική έκδοση. Ανάγνωση μόνο: read-only."
        >
          <Select
            id="invite-role"
            name="role"
            defaultValue="staff"
            disabled
            aria-disabled="true"
            title={blockedReason}
            className="cursor-not-allowed opacity-70"
          >
            {ROLE_OPTIONS_EL.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          disabled
          aria-disabled="true"
          title={blockedReason}
          className="inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-lg border-2 border-ink-300 bg-ink-100 px-4 text-sm font-bold text-ink-500 opacity-70"
        >
          Προσθήκη
        </button>
      </div>
    </form>
  );
}
