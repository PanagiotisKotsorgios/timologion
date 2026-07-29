# myDATA doc types MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new myDATA document types — `credit_note_correlated` (5.1) and `simplified_invoice` (11.3) — to timologion.gr, bringing supported types to 8.

**Architecture:** Additive Prisma migration (extend the `DocumentType` enum + add two nullable columns + one self-relation). Extend Wrapp mapping/classification. Extend the existing DraftEditor with a new conditional block (`CorrelatedInvoicePicker`) that shows only for `credit_note_correlated`. Server prefetch of the tenant's issued docs (last 12 months, capped 200) powers the parent-invoice dropdown.

**Tech Stack:** Next.js 15 App Router · Prisma 6 + MySQL 8 · React 19 client components · Zod validation · TypeScript strict mode. Verification is `npx tsc --noEmit` per task and `npm run build` at the end (this codebase does not carry a unit-test suite; correctness against Wrapp/myDATA is validated by staging smoke tests listed in Task 8).

**Design spec:** `docs/superpowers/specs/2026-07-28-mydata-doc-types-mvp-design.md`

---

## File map

| File | Purpose | Change type |
| --- | --- | --- |
| `prisma/schema.prisma` | Enum extension + 2 nullable columns + self-relation | Modify |
| `prisma/migrations/20260728000000_credit_note_correlated_and_simplified/migration.sql` | MySQL DDL | Create |
| `src/lib/wrapp/mappings.ts` | myDATA code + classification for the 2 new types | Modify |
| `src/lib/i18n.ts` | Greek labels for the 2 new types | Modify |
| `src/app/app/documents/actions.ts` | Zod extension + persist correlated fields + attemptIssueAction correlated_invoices resolution | Modify |
| `src/app/app/documents/CorrelatedInvoicePicker.tsx` | Client component: dropdown of parent docs + manual MARK fallback | Create |
| `src/app/app/documents/DraftEditor.tsx` | DOC_TYPE_OPTIONS entries, correlated state, conditional picker slot | Modify |
| `src/app/app/documents/new/page.tsx` | Prefetch issued docs for correlation | Modify |
| `src/app/app/documents/[id]/edit/page.tsx` | Prefetch issued docs + pass initial correlated values | Modify |

---

## Task 1: Prisma schema + migration + client regeneration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260728000000_credit_note_correlated_and_simplified/migration.sql`

- [ ] **Step 1.1: Extend the `DocumentType` enum in `prisma/schema.prisma`**

Locate the existing block near the top of the file:

```prisma
enum DocumentType {
  invoice
  service_invoice
  retail_receipt
  service_receipt
  credit_note
  proforma
  quote
  order
  delivery_note
}
```

Replace with:

```prisma
enum DocumentType {
  invoice
  service_invoice
  retail_receipt
  service_receipt
  simplified_invoice
  credit_note
  credit_note_correlated
  delivery_note
  proforma
  quote
  order
}
```

- [ ] **Step 1.2: Add correlated-invoice columns + self-relation to the `Document` model**

Find the `model Document {` block in `prisma/schema.prisma`. Locate the existing field list and the existing `@@index` block at the bottom of the model.

Immediately before the closing `}` of the `Document` model, add:

```prisma
  // Correlated credit-note reference — only populated when
  // type == credit_note_correlated. Either the internal parent doc id
  // (preferred) or a raw MARK for parents issued outside timologion.
  // Wrapp requires the parent's myDATA MARK on 5.1 payloads.
  correlatedDocumentId    String?
  correlatedMarkOverride  String?    @db.VarChar(80)
  correlatedDocument      Document?  @relation("CreditNoteParent", fields: [correlatedDocumentId], references: [id], onDelete: SetNull)
  reverseCorrelated       Document[] @relation("CreditNoteParent")

  @@index([correlatedDocumentId])
```

The final `@@index([correlatedDocumentId])` goes alongside the existing `@@index` and `@@map` lines at the bottom of the model — Prisma allows multiple index directives.

- [ ] **Step 1.3: Create the migration SQL file**

Path: `prisma/migrations/20260728000000_credit_note_correlated_and_simplified/migration.sql`

Contents (write exactly this):

```sql
-- Extend the DocumentType enum with two new myDATA-aligned variants.
ALTER TABLE `documents`
  MODIFY COLUMN `type` ENUM(
    'invoice',
    'service_invoice',
    'retail_receipt',
    'service_receipt',
    'simplified_invoice',
    'credit_note',
    'credit_note_correlated',
    'delivery_note',
    'proforma',
    'quote',
    'order'
  ) NOT NULL;

-- Correlated credit-note reference columns + self-referencing FK.
ALTER TABLE `documents`
  ADD COLUMN `correlatedDocumentId`   VARCHAR(191) NULL,
  ADD COLUMN `correlatedMarkOverride` VARCHAR(80)  NULL,
  ADD CONSTRAINT `documents_correlatedDocumentId_fkey`
    FOREIGN KEY (`correlatedDocumentId`)
    REFERENCES `documents`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX `documents_correlatedDocumentId_idx`
  ON `documents` (`correlatedDocumentId`);
```

- [ ] **Step 1.4: Regenerate the Prisma client**

Run:

```bash
npx prisma generate
```

Expected: prints `Generated Prisma Client (v6.x.x) to .\node_modules\@prisma\client` — no errors.

- [ ] **Step 1.5: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected: exit code 0, no output.

(Existing consumers of `DocumentType` will still compile — the new values only add options to switch statements; TypeScript does not require exhaustiveness for enums unless `--strict` narrowing is done, which we don't do at read sites.)

- [ ] **Step 1.6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260728000000_credit_note_correlated_and_simplified
git commit -m "Schema: add credit_note_correlated (5.1) + simplified_invoice (11.3) + correlated FK"
```

---

## Task 2: Wrapp mapping + classification

**Files:**
- Modify: `src/lib/wrapp/mappings.ts`

- [ ] **Step 2.1: Add `simplified_invoice` and `credit_note_correlated` cases to `mapDocumentTypeToWrapp`**

Open `src/lib/wrapp/mappings.ts` and find:

```ts
export function mapDocumentTypeToWrapp(type: DocumentType): string | null {
  switch (type) {
    case "invoice":
      return "1.1";
    case "service_invoice":
      return "2.1";
    case "retail_receipt":
      return "11.1";
    case "service_receipt":
      return "11.2";
    case "credit_note":
      // Non-correlated credit note. Correlated (5.1) would require the
      // parent's myDATA MARK in `correlated_invoices`, which we don't
      // always have — 5.2 is standalone and works everywhere.
      return "5.2";
    case "delivery_note":
      return "9.3";
    case "proforma":
    case "quote":
    case "order":
      return null;
    default:
      return null;
  }
}
```

Replace with (leaving the top of the function and imports intact):

```ts
export function mapDocumentTypeToWrapp(type: DocumentType): string | null {
  switch (type) {
    case "invoice":
      return "1.1"; // Τιμολόγιο Πώλησης
    case "service_invoice":
      return "2.1"; // Τιμολόγιο Παροχής Υπηρεσιών
    case "retail_receipt":
      return "11.1"; // Απόδειξη Λιανικής Πώλησης
    case "service_receipt":
      return "11.2"; // Απόδειξη Παροχής Υπηρεσιών
    case "simplified_invoice":
      return "11.3"; // Απλοποιημένο Τιμολόγιο
    case "credit_note":
      // Non-correlated credit note. Standalone — no parent MARK.
      return "5.2";
    case "credit_note_correlated":
      // Correlated credit note. Wrapp requires the parent's myDATA MARK
      // in `correlated_invoices`; attemptIssueAction refuses to submit
      // without one.
      return "5.1";
    case "delivery_note":
      return "9.3"; // Δελτίο Αποστολής
    case "proforma":
    case "quote":
    case "order":
      return null; // internal-only
    default:
      return null;
  }
}
```

- [ ] **Step 2.2: Extend `classificationFor` for `simplified_invoice`**

Find the existing `classificationFor` function (same file, further down):

```ts
export function classificationFor(type: DocumentType): {
  category: string;
  type: string;
} {
  if (type === "delivery_note")
    return { category: "category3", type: "_" };
  if (type === "invoice" || type === "service_invoice" || type === "credit_note")
    return { category: "category1_3", type: "E3_561_001" };
  if (type === "retail_receipt" || type === "service_receipt")
    return { category: "category1_3", type: "E3_561_003" };
  return { category: "category1_3", type: "E3_561_001" };
}
```

Replace with:

```ts
export function classificationFor(type: DocumentType): {
  category: string;
  type: string;
} {
  if (type === "delivery_note")
    return { category: "category3", type: "_" };
  if (
    type === "invoice" ||
    type === "service_invoice" ||
    type === "credit_note" ||
    type === "credit_note_correlated"
  )
    return { category: "category1_3", type: "E3_561_001" };
  if (
    type === "retail_receipt" ||
    type === "service_receipt" ||
    type === "simplified_invoice"
  )
    return { category: "category1_3", type: "E3_561_003" };
  return { category: "category1_3", type: "E3_561_001" };
}
```

- [ ] **Step 2.3: Type-check**

```bash
npx tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 2.4: Commit**

```bash
git add src/lib/wrapp/mappings.ts
git commit -m "Wrapp: map credit_note_correlated → 5.1 + simplified_invoice → 11.3"
```

---

## Task 3: Greek i18n labels

**Files:**
- Modify: `src/lib/i18n.ts`

- [ ] **Step 3.1: Locate the documents.types map**

Open `src/lib/i18n.ts` and search for `documents:` — you'll find a nested block:

```ts
documents: {
  types: {
    invoice: "Τιμολόγιο πώλησης",
    service_invoice: "Τιμολόγιο παροχής",
    retail_receipt: "Απόδειξη λιανικής",
    service_receipt: "Απόδειξη παροχής",
    credit_note: "Πιστωτικό",
    proforma: "Προτιμολόγιο",
    quote: "Προσφορά",
    order: "Παραγγελία",
    delivery_note: "Δελτίο αποστολής",
  },
  // ...
},
```

- [ ] **Step 3.2: Add the two new keys**

Modify to:

```ts
documents: {
  types: {
    invoice: "Τιμολόγιο πώλησης",
    service_invoice: "Τιμολόγιο παροχής",
    retail_receipt: "Απόδειξη λιανικής",
    service_receipt: "Απόδειξη παροχής",
    simplified_invoice: "Απλοποιημένο τιμολόγιο",
    credit_note: "Πιστωτικό (μη συσχ.)",
    credit_note_correlated: "Πιστωτικό (συσχ.)",
    proforma: "Προτιμολόγιο",
    quote: "Προσφορά",
    order: "Παραγγελία",
    delivery_note: "Δελτίο αποστολής",
  },
  // ...
},
```

Two things worth calling out:
- `credit_note` label gets the "μη συσχ." qualifier so the UI clearly distinguishes it from the new `credit_note_correlated`.
- Preserve any other adjacent keys (`status`, etc.) exactly as they were.

- [ ] **Step 3.3: Type-check**

```bash
npx tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 3.4: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "i18n: labels for credit_note_correlated + simplified_invoice + qualify credit_note"
```

---

## Task 4: Server actions — Zod, persistence, issue-time payload

**Files:**
- Modify: `src/app/app/documents/actions.ts`

- [ ] **Step 4.1: Extend the `draftSchema` Zod object**

Open `src/app/app/documents/actions.ts` and find the `draftSchema` definition (search for `const draftSchema = z.object`). It currently ends with:

```ts
  dispatchReason: z.string().max(200).optional().or(z.literal("")),
  dispatchPurpose: z.string().max(200).optional().or(z.literal("")),
  destinationAddress: z.string().max(400).optional().or(z.literal("")),
  vehicleNumber: z.string().max(40).optional().or(z.literal("")),
  driverName: z.string().max(160).optional().or(z.literal("")),
});
```

Immediately before the closing `});`, add:

```ts
  // Correlated credit-note (5.1) fields — server nulls them out on
  // any other type, so they only matter when type == credit_note_correlated.
  correlatedDocumentId: z.string().optional().or(z.literal("")),
  correlatedMarkOverride: z.string().max(80).optional().or(z.literal("")),
```

Result (last several fields):

```ts
  destinationAddress: z.string().max(400).optional().or(z.literal("")),
  vehicleNumber: z.string().max(40).optional().or(z.literal("")),
  driverName: z.string().max(160).optional().or(z.literal("")),
  correlatedDocumentId: z.string().optional().or(z.literal("")),
  correlatedMarkOverride: z.string().max(80).optional().or(z.literal("")),
});
```

- [ ] **Step 4.2: Persist correlated fields in `createDraftAction`**

Within `createDraftAction`, find the block that populates the create payload:

```ts
    const d = await tx.document.create({
      data: {
        businessId: ctx.businessId,
        clientId: parsed.data.clientId || null,
        // ...
        dispatchAt: parsed.data.dispatchAt
          ? new Date(parsed.data.dispatchAt)
          : null,
        dispatchReason: parsed.data.dispatchReason || null,
        dispatchPurpose: parsed.data.dispatchPurpose || null,
        destinationAddress: parsed.data.destinationAddress || null,
        vehicleNumber: parsed.data.vehicleNumber || null,
        driverName: parsed.data.driverName || null,
        netTotalAmount: totals.netTotal,
        // ...
```

Immediately after `driverName:` and before `netTotalAmount:`, insert:

```ts
        correlatedDocumentId:
          parsed.data.type === "credit_note_correlated"
            ? parsed.data.correlatedDocumentId || null
            : null,
        correlatedMarkOverride:
          parsed.data.type === "credit_note_correlated"
            ? parsed.data.correlatedMarkOverride || null
            : null,
```

- [ ] **Step 4.3: Persist correlated fields in `updateDraftAction`**

Find the `updateDraftAction`'s `tx.document.update({...})` call and add the same two lines in the corresponding position (right after `driverName:` and before `netTotalAmount:`):

```ts
        correlatedDocumentId:
          parsed.data.type === "credit_note_correlated"
            ? parsed.data.correlatedDocumentId || null
            : null,
        correlatedMarkOverride:
          parsed.data.type === "credit_note_correlated"
            ? parsed.data.correlatedMarkOverride || null
            : null,
```

- [ ] **Step 4.4: Include `correlatedDocument` in the `attemptIssueAction` fetch**

Find the top of `attemptIssueAction`:

```ts
  const doc = await prisma.document.findFirst({
    where: { id: documentId, businessId: ctx.businessId },
    include: { client: true, lines: true },
  });
```

Change to:

```ts
  const doc = await prisma.document.findFirst({
    where: { id: documentId, businessId: ctx.businessId },
    include: {
      client: true,
      lines: true,
      correlatedDocument: { select: { myDataMark: true } },
    },
  });
```

- [ ] **Step 4.5: Resolve the parent MARK and populate `correlated_invoices`**

Find the block where `wrappPayload` is assembled (search for `const wrappPayload = {`). Immediately BEFORE that line, insert:

```ts
  // Correlated credit note (5.1) — Wrapp requires the parent's myDATA
  // MARK in `correlated_invoices`. We prefer the linked local doc's
  // stored MARK; the manual override is the escape hatch for pre-
  // migration parents that live outside timologion.
  let correlatedInvoices: string[] | undefined;
  if (doc.type === "credit_note_correlated") {
    const parentMark =
      doc.correlatedDocument?.myDataMark ?? doc.correlatedMarkOverride;
    if (!parentMark) {
      await prisma.document
        .update({ where: { id: doc.id }, data: { status: "draft" } })
        .catch(() => undefined);
      return {
        ok: false as const,
        error:
          "Το πιστωτικό 5.1 (συσχετιζόμενο) απαιτεί το MARK του γονικού παραστατικού. Επίλεξε το γονικό στο πεδίο «Συσχετιζόμενο παραστατικό» ή δώσε το MARK χειροκίνητα.",
      };
    }
    correlatedInvoices = [parentMark];
  }
```

Then locate the actual `wrappPayload` object literal (a few lines further down). It currently starts with:

```ts
  const wrappPayload = {
    invoice_type_code: invoiceTypeCode,
    billing_book_id: book.wrappBookId,
    branch: branch?.wrappBranchId ?? undefined,
    payment_method_type: mapPaymentMethodToWrapp(doc.paymentMethod),
```

Find the property where `is_delivery_note` and `delivery_detail` are set (the delivery-note additions from earlier). Immediately below `delivery_detail: deliveryDetail,` — or if you can't find that exact line, at the end of the object literal just before the closing brace — add:

```ts
    correlated_invoices: correlatedInvoices,
```

- [ ] **Step 4.6: Type-check**

```bash
npx tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 4.7: Commit**

```bash
git add src/app/app/documents/actions.ts
git commit -m "Actions: persist + issue correlated 5.1 (parent MARK required, override fallback)"
```

---

## Task 5: CorrelatedInvoicePicker component

**Files:**
- Create: `src/app/app/documents/CorrelatedInvoicePicker.tsx`

- [ ] **Step 5.1: Create the component file**

Write to `src/app/app/documents/CorrelatedInvoicePicker.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/Input";
import { money, date } from "@/lib/format";

export type IssuedDocOption = {
  id: string;
  label: string;      // e.g. "A #123"
  issueDate: string;  // ISO string
  clientName: string; // "—" if no client
  totalAmount: number;
  myDataMark: string; // guaranteed non-null in the parent query
};

/**
 * Parent-invoice picker for 5.1 correlated credit notes. Two mutually
 * exclusive inputs:
 *   1. Dropdown of the tenant's issued docs (max 200, last 12mo, filtered
 *      by client where possible). Server resolves the parent's myDataMark
 *      at issue time.
 *   2. Collapsible manual MARK text field for parents that live outside
 *      timologion (imported ledger, mid-year migration).
 */
export function CorrelatedInvoicePicker({
  options,
  correlatedDocumentId,
  onCorrelatedDocumentIdChange,
  correlatedMarkOverride,
  onCorrelatedMarkOverrideChange,
}: {
  options: IssuedDocOption[];
  correlatedDocumentId: string;
  onCorrelatedDocumentIdChange: (v: string) => void;
  correlatedMarkOverride: string;
  onCorrelatedMarkOverrideChange: (v: string) => void;
}) {
  // Show the manual MARK input by default when there's already an
  // override in state OR when the dropdown has nothing to pick.
  const [manualOpen, setManualOpen] = useState(
    Boolean(correlatedMarkOverride) || options.length === 0,
  );

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-5">
      <p className="text-[11px] font-black uppercase tracking-widest text-amber-900/80">
        Συσχετιζόμενο παραστατικό (απαιτείται για 5.1)
      </p>
      <p className="mt-1 text-sm text-amber-900/80">
        Το πιστωτικό αφορά ένα γονικό παραστατικό. Επίλεξέ το από τη
        λίστα ή δώσε το MARK χειροκίνητα.
      </p>

      <div className="mt-4 space-y-3">
        <Field label="Επιλογή από εκδοθέντα" htmlFor="correlated-doc">
          <Select
            id="correlated-doc"
            value={correlatedDocumentId}
            onChange={(e) => {
              onCorrelatedDocumentIdChange(e.target.value);
              if (e.target.value) onCorrelatedMarkOverrideChange("");
            }}
            disabled={options.length === 0}
          >
            <option value="">
              {options.length === 0
                ? "— Δεν υπάρχουν εκδοθέντα παραστατικά —"
                : "— Επιλέξτε παραστατικό —"}
            </option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label} · {date(new Date(o.issueDate))} · {o.clientName} ·{" "}
                {money(o.totalAmount)}
              </option>
            ))}
          </Select>
        </Field>

        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
          className="text-sm font-semibold text-amber-900 underline underline-offset-4 hover:text-brand-900"
        >
          {manualOpen ? "Απόκρυψη χειροκίνητης εισαγωγής" : "Ή MARK χειροκίνητα..."}
        </button>

        {manualOpen && (
          <Field
            label="MARK γονικού παραστατικού"
            htmlFor="correlated-mark"
            hint="Χρησιμοποίησέ το μόνο αν το γονικό δεν έχει εκδοθεί μέσα από το timologion."
          >
            <Input
              id="correlated-mark"
              value={correlatedMarkOverride}
              onChange={(e) => {
                onCorrelatedMarkOverrideChange(e.target.value);
                if (e.target.value) onCorrelatedDocumentIdChange("");
              }}
              maxLength={80}
              placeholder="π.χ. 400001234567890"
              className="mono"
            />
          </Field>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5.2: Type-check**

```bash
npx tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 5.3: Commit**

```bash
git add src/app/app/documents/CorrelatedInvoicePicker.tsx
git commit -m "Add CorrelatedInvoicePicker for 5.1 credit-note parent reference"
```

---

## Task 6: DraftEditor client wiring

**Files:**
- Modify: `src/app/app/documents/DraftEditor.tsx`

- [ ] **Step 6.1: Import the picker + its option type**

Near the top of `src/app/app/documents/DraftEditor.tsx`, alongside the other imports from this directory (search for `import { QuickAddClientButton }`), add:

```tsx
import {
  CorrelatedInvoicePicker,
  type IssuedDocOption,
} from "./CorrelatedInvoicePicker";
```

- [ ] **Step 6.2: Add the two new types to `DOC_TYPE_OPTIONS`**

Find the `DOC_TYPE_OPTIONS` array (search `DOC_TYPE_OPTIONS`). It currently reads roughly:

```ts
const DOC_TYPE_OPTIONS: { value: DraftInput["type"]; label: string }[] = [
  { value: "invoice", label: "Τιμολόγιο πώλησης (1.1)" },
  { value: "service_invoice", label: "Τιμολόγιο παροχής (2.1)" },
  { value: "retail_receipt", label: "Απόδειξη λιανικής (11.1)" },
  { value: "service_receipt", label: "Απόδειξη παροχής υπηρεσιών (11.4)" },
  { value: "credit_note", label: "Πιστωτικό (5.1)" },
  { value: "proforma", label: "Προτιμολόγιο" },
  { value: "quote", label: "Προσφορά" },
  { value: "order", label: "Παραγγελία" },
  { value: "delivery_note", label: "Δελτίο αποστολής" },
];
```

Replace with:

```ts
const DOC_TYPE_OPTIONS: { value: DraftInput["type"]; label: string }[] = [
  { value: "invoice", label: "Τιμολόγιο πώλησης (1.1)" },
  { value: "service_invoice", label: "Τιμολόγιο παροχής (2.1)" },
  { value: "retail_receipt", label: "Απόδειξη λιανικής (11.1)" },
  { value: "service_receipt", label: "Απόδειξη παροχής υπηρεσιών (11.2)" },
  { value: "simplified_invoice", label: "Απλοποιημένο τιμολόγιο (11.3)" },
  { value: "credit_note", label: "Πιστωτικό μη συσχετιζόμενο (5.2)" },
  { value: "credit_note_correlated", label: "Πιστωτικό συσχετιζόμενο (5.1)" },
  { value: "delivery_note", label: "Δελτίο αποστολής (9.3)" },
  { value: "proforma", label: "Προτιμολόγιο" },
  { value: "quote", label: "Προσφορά" },
  { value: "order", label: "Παραγγελία" },
];
```

(Also fixes the incorrect `11.4` label for service receipt → `11.2`.)

- [ ] **Step 6.3: Extend `DraftEditorInitial` with correlated fields**

Find `export type DraftEditorInitial = {` and append two optional string fields near the bottom of the object (right before the closing `};`), next to `driverName?: string;`:

```ts
  correlatedDocumentId?: string;
  correlatedMarkOverride?: string;
```

- [ ] **Step 6.4: Add `issuedDocsForCorrelation` prop to `DraftEditor`**

Find the `DraftEditor` component signature (search `export function DraftEditor(`). It currently accepts something like:

```tsx
export function DraftEditor({
  initialType,
  businessName,
  clients,
  items,
  branches,
  books,
  editing,
  defaultNotes = "",
}: {
  initialType?: DraftInput["type"];
  businessName: string;
  clients: ClientOption[];
  items: ItemOption[];
  branches: BranchOption[];
  books: BookOption[];
  editing?: DraftEditorInitial;
  defaultNotes?: string;
}) {
```

Change the signature to:

```tsx
export function DraftEditor({
  initialType,
  businessName,
  clients,
  items,
  branches,
  books,
  editing,
  defaultNotes = "",
  issuedDocsForCorrelation = [],
}: {
  initialType?: DraftInput["type"];
  businessName: string;
  clients: ClientOption[];
  items: ItemOption[];
  branches: BranchOption[];
  books: BookOption[];
  editing?: DraftEditorInitial;
  defaultNotes?: string;
  issuedDocsForCorrelation?: IssuedDocOption[];
}) {
```

- [ ] **Step 6.5: Add correlated state hooks**

Find where existing state hooks live (near the top of the component body — search for `const [driverName, setDriverName] = useState`). Immediately after that line, add:

```tsx
  // Correlated credit-note (5.1) reference — parent invoice picker.
  const [correlatedDocumentId, setCorrelatedDocumentId] = useState(
    editing?.correlatedDocumentId ?? "",
  );
  const [correlatedMarkOverride, setCorrelatedMarkOverride] = useState(
    editing?.correlatedMarkOverride ?? "",
  );
```

- [ ] **Step 6.6: Extend the payload built in `submit()`**

Find the `submit()` function and the object literal for `const payload: DraftInput = { ... }`. It ends with delivery-note fields:

```tsx
      driverName:
        type === "delivery_note" ? driverName || undefined : undefined,
    };
```

Change to:

```tsx
      driverName:
        type === "delivery_note" ? driverName || undefined : undefined,
      correlatedDocumentId:
        type === "credit_note_correlated"
          ? correlatedDocumentId || undefined
          : undefined,
      correlatedMarkOverride:
        type === "credit_note_correlated"
          ? correlatedMarkOverride || undefined
          : undefined,
    };
```

- [ ] **Step 6.7: Render the picker slot when type is 5.1**

Find where `DispatchInfoCard` is rendered — a block that starts with:

```tsx
        {type === "delivery_note" ? (
          <DispatchInfoCard
```

Immediately BEFORE that `{type === "delivery_note" ? (` line (still inside the parent container div), add a sibling block:

```tsx
        {type === "credit_note_correlated" && (
          <CorrelatedInvoicePicker
            options={issuedDocsForCorrelation}
            correlatedDocumentId={correlatedDocumentId}
            onCorrelatedDocumentIdChange={setCorrelatedDocumentId}
            correlatedMarkOverride={correlatedMarkOverride}
            onCorrelatedMarkOverrideChange={setCorrelatedMarkOverride}
          />
        )}
```

This places the picker in the same column as the payment/dispatch cards, above them.

- [ ] **Step 6.8: Type-check**

```bash
npx tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 6.9: Commit**

```bash
git add src/app/app/documents/DraftEditor.tsx
git commit -m "DraftEditor: 5.1 correlated picker slot + 11.3 in type dropdown"
```

---

## Task 7: Server prefetch on new + edit pages

**Files:**
- Modify: `src/app/app/documents/new/page.tsx`
- Modify: `src/app/app/documents/[id]/edit/page.tsx`

- [ ] **Step 7.1: Add the issued-docs query to `documents/new/page.tsx`**

Open `src/app/app/documents/new/page.tsx`. Find the `Promise.all([ ... ])` block that fetches `business`, `clients`, `items`, `branches`, `books`.

Immediately before that `Promise.all`, add a helper:

```tsx
  // 12-month cutoff for the parent-invoice picker (5.1 credit notes).
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
```

Then extend the `Promise.all` to include an additional query. Change:

```tsx
  const [business, clients, items, branches, books] = await Promise.all([
```

to:

```tsx
  const [
    business,
    clients,
    items,
    branches,
    books,
    issuedDocsRaw,
  ] = await Promise.all([
```

And immediately before the closing `]);` of the `Promise.all`, add a new query call (comma at the end of the previous line):

```tsx
    prisma.document.findMany({
      where: {
        businessId: ctx.businessId,
        status: "issued",
        myDataMark: { not: null },
        type: {
          notIn: [
            "credit_note",
            "credit_note_correlated",
            "delivery_note",
            "proforma",
            "quote",
            "order",
          ],
        },
        issueDate: { gte: twelveMonthsAgo },
      },
      orderBy: { issueDate: "desc" },
      take: 200,
      select: {
        id: true,
        series: true,
        number: true,
        issueDate: true,
        totalAmount: true,
        myDataMark: true,
        client: { select: { legalName: true, tradeName: true } },
      },
    }),
```

- [ ] **Step 7.2: Shape the picker payload**

After the `Promise.all` returns, add:

```tsx
  const issuedDocsForCorrelation = issuedDocsRaw
    .filter((d): d is typeof d & { myDataMark: string } => Boolean(d.myDataMark))
    .map((d) => ({
      id: d.id,
      label:
        (d.series ?? "") + (d.number != null ? ` #${d.number}` : "") || d.id.slice(0, 8),
      issueDate: d.issueDate.toISOString(),
      clientName: d.client?.tradeName ?? d.client?.legalName ?? "—",
      totalAmount: Number(d.totalAmount),
      myDataMark: d.myDataMark,
    }));
```

- [ ] **Step 7.3: Pass the payload to `DraftEditor`**

Find the `<DraftEditor` JSX render at the bottom of the file. Add the prop:

```tsx
        issuedDocsForCorrelation={issuedDocsForCorrelation}
```

Place it alongside the other props (e.g., after `books={books}`).

- [ ] **Step 7.4: Repeat the whole change on the edit page**

Open `src/app/app/documents/[id]/edit/page.tsx` and mirror Steps 7.1, 7.2, and 7.3 in the same way — the file follows the same shape as `new/page.tsx`.

Also: in the `<DraftEditor editing={{ ... }}` object, add the two initial correlated values so editing a saved 5.1 draft still shows the picker's current selection. Find the block where `dispatchAt`, etc. are populated. Immediately after `driverName: doc.driverName ?? "",` add:

```tsx
          correlatedDocumentId: doc.correlatedDocumentId ?? "",
          correlatedMarkOverride: doc.correlatedMarkOverride ?? "",
```

- [ ] **Step 7.5: Type-check**

```bash
npx tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 7.6: Commit**

```bash
git add src/app/app/documents/new/page.tsx src/app/app/documents/\[id\]/edit/page.tsx
git commit -m "Docs pages: prefetch issued docs for 5.1 correlation picker"
```

---

## Task 8: Full build + staging smoke test checklist

**Files:** (verification only — no code changes)

- [ ] **Step 8.1: Run the production build**

```bash
npm run build
```

Expected: exit code 0. Should compile all routes including `/app/documents/new` and `/app/documents/[id]/edit`. Any TS/lint error here needs to be fixed before deploying.

- [ ] **Step 8.2: Push to trigger Coolify deployment**

```bash
git push
```

- [ ] **Step 8.3: Wait for Coolify to redeploy, then run the staging smoke-test checklist**

Against a tenant configured with `WRAPP_API_BASE_URL=https://staging.wrapp.ai/api/v1`:

- Issue a `simplified_invoice` (11.3) with a real client → expect Wrapp 200, doc receives a MARK.
- Issue a `simplified_invoice` (11.3) with no client (anonymous consumer) → expect Wrapp 200.
- Ensure an existing `invoice` (1.1) is issued and has a `myDataMark`. Then create a `credit_note_correlated` draft, pick that invoice from the picker, issue → expect Wrapp 200 + response's `correlated_invoices` contains the parent MARK.
- Create a `credit_note_correlated` draft, leave the parent dropdown empty, type a MARK into the manual override, issue → expect Wrapp 200.
- Create a `credit_note_correlated` draft with neither parent nor manual MARK → expect the Greek-language validation error (no Wrapp call).

- [ ] **Step 8.4: If any smoke test fails, capture the Wrapp error**

The `Document.lastWrappError` column stores the error string. Query it via the admin surface or open the document detail page for the failing doc.

- [ ] **Step 8.5: Final commit (if any polish needed)**

If smoke testing surfaces small fixes:

```bash
git add -A
git commit -m "Follow-up: <describe fix>"
git push
```

---

## Rollback

If something goes wrong post-deploy:

1. Migration is additive — no data loss risk from the schema itself. To force-revert, run this SQL manually:
   ```sql
   ALTER TABLE `documents` DROP FOREIGN KEY `documents_correlatedDocumentId_fkey`;
   ALTER TABLE `documents` DROP INDEX `documents_correlatedDocumentId_idx`;
   ALTER TABLE `documents`
     DROP COLUMN `correlatedDocumentId`,
     DROP COLUMN `correlatedMarkOverride`;
   ALTER TABLE `documents`
     MODIFY COLUMN `type` ENUM('invoice','service_invoice','retail_receipt','service_receipt','credit_note','delivery_note','proforma','quote','order') NOT NULL;
   DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20260728000000_credit_note_correlated_and_simplified';
   ```
   Then `git revert` the schema + migration commits and redeploy.

2. Code-only issues: `git revert` the offending commit(s) and redeploy — the columns can stay empty on prod indefinitely without consequence.
