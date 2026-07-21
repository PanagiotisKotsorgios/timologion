import { z, ZodIssueCode, type ZodErrorMap } from "zod";

// Friendly Greek labels for Zod's primitive type names.
const TYPE_EL: Record<string, string> = {
  string: "κείμενο",
  number: "αριθμός",
  integer: "ακέραιος αριθμός",
  boolean: "ναι/όχι",
  date: "ημερομηνία",
  bigint: "μεγάλος αριθμός",
  undefined: "άδειο",
  null: "άδειο",
  array: "λίστα",
  object: "αντικείμενο",
  unknown: "άγνωστο",
  never: "μη έγκυρη τιμή",
  void: "τίποτα",
  symbol: "σύμβολο",
  function: "συνάρτηση",
  map: "χάρτης",
  set: "σύνολο",
  nan: "μη έγκυρος αριθμός",
};

const type = (raw: string): string => TYPE_EL[raw] ?? raw;

const REQUIRED = "Το πεδίο είναι υποχρεωτικό.";

/**
 * Server-safe Greek error map. Covers every ZodIssueCode surface we care
 * about with human-readable Greek. Registered globally via `installZodEl()`.
 * Individual schemas can still override any message inline.
 */
export const zodErrorMapEl: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case ZodIssueCode.invalid_type: {
      if (issue.received === "undefined" || issue.received === "null") {
        return { message: REQUIRED };
      }
      return {
        message: `Περίμενα ${type(issue.expected)} και έλαβα ${type(issue.received)}.`,
      };
    }

    case ZodIssueCode.invalid_literal:
      return { message: "Η τιμή δεν είναι έγκυρη." };

    case ZodIssueCode.unrecognized_keys:
      return { message: "Η φόρμα περιέχει άγνωστα πεδία." };

    case ZodIssueCode.invalid_union:
    case ZodIssueCode.invalid_union_discriminator:
      return { message: "Η τιμή δεν ταιριάζει με καμία από τις επιτρεπόμενες μορφές." };

    case ZodIssueCode.invalid_enum_value:
      return {
        message: `Επίτρεπτες τιμές: ${issue.options.join(", ")}.`,
      };

    case ZodIssueCode.invalid_arguments:
    case ZodIssueCode.invalid_return_type:
      return { message: "Μη έγκυρα δεδομένα." };

    case ZodIssueCode.invalid_date:
      return { message: "Η ημερομηνία δεν είναι έγκυρη." };

    case ZodIssueCode.invalid_string: {
      const v = issue.validation;
      if (v === "email") return { message: "Το email δεν είναι έγκυρο." };
      if (v === "url") return { message: "Η διεύθυνση URL δεν είναι έγκυρη." };
      if (v === "uuid") return { message: "Ο κωδικός δεν είναι έγκυρος." };
      if (v === "regex") return { message: "Η μορφή του πεδίου δεν είναι σωστή." };
      if (v === "cuid" || v === "cuid2")
        return { message: "Ο κωδικός δεν είναι έγκυρος." };
      if (v === "datetime")
        return { message: "Η ημερομηνία/ώρα δεν είναι σε σωστή μορφή." };
      if (typeof v === "object" && v !== null) {
        if ("startsWith" in v)
          return { message: `Πρέπει να ξεκινά με "${v.startsWith}".` };
        if ("endsWith" in v)
          return { message: `Πρέπει να τελειώνει σε "${v.endsWith}".` };
        if ("includes" in v)
          return { message: `Πρέπει να περιέχει "${v.includes}".` };
      }
      return { message: "Η μορφή του πεδίου δεν είναι σωστή." };
    }

    case ZodIssueCode.too_small: {
      const t = issue.type;
      const min = Number(issue.minimum);
      if (t === "string") {
        if (min === 1 || min === 0) return { message: REQUIRED };
        return { message: `Χρειάζονται τουλάχιστον ${min} χαρακτήρες.` };
      }
      if (t === "number" || t === "bigint")
        return {
          message: issue.inclusive
            ? `Πρέπει να είναι τουλάχιστον ${min}.`
            : `Πρέπει να είναι μεγαλύτερο από ${min}.`,
        };
      if (t === "array")
        return { message: `Πρέπει να έχει τουλάχιστον ${min} στοιχεία.` };
      if (t === "set")
        return { message: `Πρέπει να έχει τουλάχιστον ${min} στοιχεία.` };
      if (t === "date")
        return { message: `Η ημερομηνία πρέπει να είναι μετά τις ${new Date(min).toLocaleDateString("el-GR")}.` };
      return { message: `Πολύ μικρή τιμή (ελάχιστο ${min}).` };
    }

    case ZodIssueCode.too_big: {
      const t = issue.type;
      const max = Number(issue.maximum);
      if (t === "string")
        return { message: `Το ανώτατο επιτρεπτό είναι ${max} χαρακτήρες.` };
      if (t === "number" || t === "bigint")
        return {
          message: issue.inclusive
            ? `Πρέπει να είναι το πολύ ${max}.`
            : `Πρέπει να είναι μικρότερο από ${max}.`,
        };
      if (t === "array")
        return { message: `Το ανώτατο επιτρεπτό είναι ${max} στοιχεία.` };
      if (t === "set")
        return { message: `Το ανώτατο επιτρεπτό είναι ${max} στοιχεία.` };
      if (t === "date")
        return { message: `Η ημερομηνία πρέπει να είναι πριν τις ${new Date(max).toLocaleDateString("el-GR")}.` };
      return { message: `Πολύ μεγάλη τιμή (μέγιστο ${max}).` };
    }

    case ZodIssueCode.custom: {
      const params = issue.params as { i18n?: string } | undefined;
      if (params?.i18n) return { message: params.i18n };
      return { message: ctx.defaultError };
    }

    case ZodIssueCode.invalid_intersection_types:
      return { message: "Τα δεδομένα δεν συμφωνούν μεταξύ τους." };

    case ZodIssueCode.not_multiple_of:
      return {
        message: `Πρέπει να είναι πολλαπλάσιο του ${Number(issue.multipleOf)}.`,
      };

    case ZodIssueCode.not_finite:
      return { message: "Ο αριθμός δεν είναι έγκυρος." };

    default:
      return { message: ctx.defaultError };
  }
};

let installed = false;
export function installZodEl() {
  if (installed) return;
  z.setErrorMap(zodErrorMapEl);
  installed = true;
}

// Auto-install on import so any module that references anything from this
// file gets Greek defaults with a single-line import elsewhere.
installZodEl();

// ─── Friendly Greek field labels used in error messages ─────────────────

const FIELD_EL: Record<string, string> = {
  // Auth
  email: "Email",
  password: "Κωδικός",
  fullName: "Ονοματεπώνυμο",
  // Business & onboarding
  vatNumber: "ΑΦΜ",
  legalName: "Νόμιμη επωνυμία",
  tradeName: "Διακριτικός τίτλος",
  taxOffice: "ΔΟΥ",
  activity: "Δραστηριότητα",
  addressLine: "Διεύθυνση",
  city: "Πόλη",
  postalCode: "Τ.Κ.",
  phone: "Τηλέφωνο",
  // Client
  notes: "Σημειώσεις",
  tags: "Ετικέτες",
  // Item
  name: "Ονομασία",
  code: "Κωδικός",
  unit: "Μονάδα",
  description: "Περιγραφή",
  defaultPrice: "Τιμή",
  vatRate: "ΦΠΑ",
  vatCategory: "Κατηγορία ΦΠΑ",
  kind: "Τύπος",
  // Document
  type: "Τύπος",
  documentType: "Τύπος παραστατικού",
  clientId: "Πελάτης",
  branchId: "Υποκατάστημα",
  billingBookId: "Σειρά",
  series: "Σειρά",
  issueDate: "Ημερομηνία",
  quantity: "Ποσότητα",
  unitPrice: "Τιμή",
  discountPct: "Έκπτωση",
  lines: "Γραμμές",
  nextNumber: "Επόμενος αριθμός",
  label: "Ονομασία",
  isDefault: "Προεπιλογή",
  // Users / admin
  memberId: "Μέλος",
  userId: "Χρήστης",
  businessId: "Επιχείρηση",
  role: "Ρόλος",
  // Contact
  company: "Επιχείρηση",
  message: "Μήνυμα",
};

function labelFor(path: (string | number)[] | undefined): string | null {
  if (!path || path.length === 0) return null;
  // Prefer the first key; if it's a number (array index), try the next.
  for (const p of path) {
    if (typeof p === "string" && FIELD_EL[p]) return FIELD_EL[p];
  }
  return null;
}

/**
 * Turn a ZodError into a compact Greek sentence suitable for a form-level
 * alert. Groups by (label · message) and shows up to three issues.
 */
export function formatZodError(err: z.ZodError): string {
  const parts = err.issues.slice(0, 3).map((issue) => {
    const label = labelFor(issue.path);
    return label ? `${label}: ${issue.message}` : issue.message;
  });
  return parts.join(" · ");
}
