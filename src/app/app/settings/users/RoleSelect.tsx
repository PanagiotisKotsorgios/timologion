"use client";

import type { BusinessRole } from "@prisma/client";
import { ROLE_OPTIONS_EL } from "@/lib/roles";
import { updateMemberRoleAction } from "./actions";

export function RoleSelect({
  memberId,
  role,
  disabled,
}: {
  memberId: string;
  role: BusinessRole;
  disabled?: boolean;
}) {
  return (
    <form action={updateMemberRoleAction}>
      <input type="hidden" name="memberId" value={memberId} />
      <select
        name="role"
        defaultValue={role}
        disabled={disabled}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-ink-300 bg-white px-2 py-1 text-sm disabled:bg-ink-100 disabled:text-ink-500"
      >
        {ROLE_OPTIONS_EL.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}
