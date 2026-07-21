"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { promoteAdminAction, type AdminActionState } from "./actions";

export function PromoteForm() {
  const [state, formAction, pending] = useActionState<
    AdminActionState,
    FormData
  >(promoteAdminAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Email χρήστη" htmlFor="promote-email" className="md:col-span-2">
          <Input id="promote-email" name="email" type="email" required />
        </Field>
        <Field label="Ρόλος" htmlFor="promote-role">
          <Select id="promote-role" name="role" defaultValue="support">
            <option value="super_admin">super_admin</option>
            <option value="support">support</option>
            <option value="analyst">analyst</option>
          </Select>
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "..." : "Ανάθεση ρόλου"}
        </Button>
      </div>
    </form>
  );
}
