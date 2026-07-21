import type { BusinessRole } from "@prisma/client";

// Actions we currently guard on. Add more as modules grow.
export type Action =
  | "business:update"
  | "business:delete"
  | "member:invite"
  | "member:update_role"
  | "member:remove"
  | "wrapp:manage"
  | "client:read"
  | "client:write"
  | "item:read"
  | "item:write"
  | "document:read"
  | "document:write"
  | "document:issue"
  | "audit:read";

const MATRIX: Record<BusinessRole, ReadonlySet<Action>> = {
  owner: new Set<Action>([
    "business:update",
    "business:delete",
    "member:invite",
    "member:update_role",
    "member:remove",
    "wrapp:manage",
    "client:read",
    "client:write",
    "item:read",
    "item:write",
    "document:read",
    "document:write",
    "document:issue",
    "audit:read",
  ]),
  admin: new Set<Action>([
    "business:update",
    "member:invite",
    "member:update_role",
    "member:remove",
    "wrapp:manage",
    "client:read",
    "client:write",
    "item:read",
    "item:write",
    "document:read",
    "document:write",
    "document:issue",
    "audit:read",
  ]),
  accountant: new Set<Action>([
    "client:read",
    "client:write",
    "item:read",
    "item:write",
    "document:read",
    "document:write",
    "document:issue",
    "audit:read",
  ]),
  sales: new Set<Action>([
    "client:read",
    "client:write",
    "item:read",
    "document:read",
    "document:write",
  ]),
  staff: new Set<Action>([
    "client:read",
    "client:write",
    "item:read",
    "document:read",
    "document:write",
  ]),
  readonly: new Set<Action>([
    "client:read",
    "item:read",
    "document:read",
  ]),
};

export function can(role: BusinessRole, action: Action): boolean {
  return MATRIX[role].has(action);
}

export class ForbiddenError extends Error {
  constructor(action: Action) {
    super(`Δεν έχεις δικαίωμα για: ${action}`);
    this.name = "ForbiddenError";
  }
}

export function assertCan(role: BusinessRole, action: Action) {
  if (!can(role, action)) throw new ForbiddenError(action);
}
