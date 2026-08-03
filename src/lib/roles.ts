import type { BusinessRole } from "@prisma/client";

/**
 * Greek labels for member roles — used in dropdowns, badges, and lists.
 * Keep the underlying enum values in English (they match the Prisma
 * schema and RBAC matrix); only the display is translated.
 */
export const ROLE_LABEL_EL: Record<BusinessRole, string> = {
  owner: "Ιδιοκτήτης",
  admin: "Διαχειριστής",
  accountant: "Λογιστής",
  sales: "Πωλήσεις",
  staff: "Υπάλληλος",
  readonly: "Ανάγνωση μόνο",
};

export const ROLE_HELP_EL: Record<BusinessRole, string> = {
  owner: "Πλήρη δικαιώματα, συμπεριλαμβανομένων οικονομικών.",
  admin: "Όλες οι λειτουργίες εκτός διαγραφής επιχείρησης.",
  accountant: "Έκδοση παραστατικών και αναφορές.",
  sales: "Πωλήσεις, πελάτες και προσφορές.",
  staff: "Βασική έκδοση παραστατικών.",
  readonly: "Μόνο ανάγνωση δεδομένων.",
};

export const ROLE_OPTIONS_EL: { value: BusinessRole; label: string }[] = [
  "owner",
  "admin",
  "accountant",
  "sales",
  "staff",
  "readonly",
].map((r) => ({
  value: r as BusinessRole,
  label: ROLE_LABEL_EL[r as BusinessRole],
}));
