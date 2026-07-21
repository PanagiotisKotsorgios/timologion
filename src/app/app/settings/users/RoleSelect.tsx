"use client";

import type { BusinessRole } from "@prisma/client";
import { updateMemberRoleAction } from "./actions";

const OPTIONS: BusinessRole[] = [
  "owner",
  "admin",
  "accountant",
  "sales",
  "staff",
  "readonly",
];

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
        {OPTIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </form>
  );
}
