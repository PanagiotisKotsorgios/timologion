# myDATA doc types MVP — design

**Date:** 2026-07-28
**Status:** approved for implementation

## Problem

Timologion currently supports 9 internal document types mapped to 6 myDATA
codes. The Wrapp-issued forms in competitor products (Timologic) surface
30+ myDATA types, each with a slightly different set of type-specific
fields (correlated parent invoice, dispatch info, currency, self-billing,
publication type, stay-tax block, etc.). Our users need broader coverage
without waiting for a full 34-type rollout.

## Goals

Ship the 8 types Greek SMBs actually issue day-to-day, with the
type-specific fields Wrapp/myDATA requires for each. Anything else waits
for phase 2 and is added on demand.

## Non-goals

- The other ~22 myDATA types (1.2/1.3, 2.2/2.3, 3.x, 6.x, 7.x, 8.2, 13.x,
  14.x, 17.x, etc.). These are phase 2 and each gets its own spec when
  demand justifies it.
- Refactoring DraftEditor into a declarative type-config system. The
  existing conditional-block pattern (already used for delivery_note's
  DispatchInfoCard) scales fine to 8 types.
- Changing PDF rendering. Wrapp generates the PDFs.

## MVP scope

Eight types total; six are already wired, two are new.

| myDATA | Internal enum              | Notes                                      |
| ------ | -------------------------- | ------------------------------------------ |
| 1.1    | `invoice`                  | existing                                   |
| 2.1    | `service_invoice`          | existing                                   |
| 11.1   | `retail_receipt`           | existing                                   |
| 11.2   | `service_receipt`          | existing                                   |
| 11.3   | `simplified_invoice`       | **NEW** — same UI as retail receipt        |
| 5.2    | `credit_note`              | existing (non-correlated)                  |
| 5.1    | `credit_note_correlated`   | **NEW** — requires parent-invoice MARK     |
| 9.3    | `delivery_note`            | existing (has DispatchInfoCard)            |

## Design

### 1. Schema

Additive-only Prisma changes. Migration file:
`20260728000000_credit_note_correlated_and_simplified/migration.sql`.

```prisma
enum DocumentType {
  invoice
  service_invoice
  retail_receipt
  service_receipt
  simplified_invoice        // NEW
  credit_note               // 5.2 (unchanged semantics)
  credit_note_correlated    // NEW → 5.1
  delivery_note
  proforma
  quote
  order
}

model Document {
  // ... existing fields
  // Correlated credit-note reference (only meaningful when
  // type == credit_note_correlated).
  correlatedDocumentId    String?
  correlatedMarkOverride  String?   @db.VarChar(80)
  correlatedDocument      Document? @relation("CreditNoteParent", fields: [correlatedDocumentId], references: [id], onDelete: SetNull)
  reverseCorrelated       Document[] @relation("CreditNoteParent")

  @@index([correlatedDocumentId])
}
```

Migration SQL:
```sql
ALTER TABLE `documents`
  MODIFY COLUMN `type` ENUM(
    'invoice','service_invoice','retail_receipt','service_receipt',
    'simplified_invoice','credit_note','credit_note_correlated',
    'delivery_note','proforma','quote','order'
  ) NOT NULL;

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

### 2. Wrapp integration

`src/lib/wrapp/mappings.ts`:
```ts
export function mapDocumentTypeToWrapp(type: DocumentType): string | null {
  switch (type) {
    case "invoice":                 return "1.1";
    case "service_invoice":         return "2.1";
    case "retail_receipt":          return "11.1";
    case "service_receipt":         return "11.2";
    case "simplified_invoice":      return "11.3";  // NEW
    case "credit_note":             return "5.2";
    case "credit_note_correlated":  return "5.1";   // NEW
    case "delivery_note":           return "9.3";
    case "proforma":
    case "quote":
    case "order":                   return null;
  }
}

export function classificationFor(type: DocumentType) {
  if (type === "delivery_note") return { category: "category3", type: "_" };
  if (type === "retail_receipt" || type === "service_receipt" ||
      type === "simplified_invoice") {                                // NEW
    return { category: "category1_3", type: "E3_561_003" };
  }
  return { category: "category1_3", type: "E3_561_001" };
}
```

`src/app/app/documents/actions.ts::attemptIssueAction`:
After building the base `wrappPayload`, before `issueInvoice()`:
```ts
if (doc.type === "credit_note_correlated") {
  const parentMark =
    doc.correlatedDocument?.myDataMark ?? doc.correlatedMarkOverride;
  if (!parentMark) {
    return {
      ok: false as const,
      error:
        "Το πιστωτικό 5.1 (συσχετιζόμενο) απαιτεί το MARK του γονικού παραστατικού. Επίλεξε το γονικό στο πεδίο «Συσχετιζόμενο παραστατικό» ή δώσε το MARK χειροκίνητα.",
    };
  }
  wrappPayload.correlated_invoices = [parentMark];
}
```

Include `correlatedDocument` in the `attemptIssueAction` doc fetch.

### 3. UI (DraftEditor)

`DOC_TYPE_OPTIONS` extended:
```ts
{ value: "credit_note_correlated", label: "Πιστωτικό συσχετιζόμενο (5.1)" },
{ value: "credit_note",            label: "Πιστωτικό μη συσχετιζόμενο (5.2)" },
{ value: "simplified_invoice",     label: "Απλοποιημένο τιμολόγιο (11.3)" },
```

**New component**: `src/app/app/documents/CorrelatedInvoicePicker.tsx`. Renders
only when `type === "credit_note_correlated"`. Two-part UI:

1. Primary: dropdown of issued docs (populated by parent server component,
   max 200 rows, last 12 months, filtered by client if picked). Each row:
   `A #123 · 27/07/2026 · Πελάτης ΑΕ · €496,00` + tiny MARK hint.
2. Collapsible "Ή MARK χειροκίνητα" text input — for parents issued
   outside timologion. Mutually exclusive with the dropdown.

State: `correlatedDocumentId` OR `correlatedMarkOverride`. Sent through
the draft payload; server persists whichever is set.

**No new UI blocks needed** for `simplified_invoice` — reuses the standard
invoice shell.

### 4. Server prefetch

`src/app/app/documents/new/page.tsx` and `[id]/edit/page.tsx` add a query:

```ts
const issuedDocsForCorrelation = await prisma.document.findMany({
  where: {
    businessId: ctx.businessId,
    status: "issued",
    myDataMark: { not: null },
    type: { notIn: ["credit_note", "credit_note_correlated", "delivery_note"] },
    issueDate: { gte: twelveMonthsAgo },
  },
  orderBy: { issueDate: "desc" },
  take: 200,
  select: {
    id: true, series: true, number: true, issueDate: true,
    totalAmount: true, myDataMark: true,
    client: { select: { legalName: true, tradeName: true } },
  },
});
```

Passed through DraftEditor props → CorrelatedInvoicePicker options.

### 5. Draft actions

Zod schema in `draftSchema` gains two optional fields:
```ts
correlatedDocumentId: z.string().optional().or(z.literal("")),
correlatedMarkOverride: z.string().max(80).optional().or(z.literal("")),
```

Create + update handlers persist them. On any type != `credit_note_correlated`,
both are nulled server-side.

## Rollout

- Additive schema → zero downtime.
- Migration deploys with normal container start via `prisma migrate deploy`.
- No feature flag; new types appear in the dropdown after deploy.
- Post-deploy smoke test each new type against Wrapp staging
  (`WRAPP_API_BASE_URL=staging.wrapp.ai/api/v1`):
  - Issue an 11.3 with a real client → expect success + MARK.
  - Issue an 11.3 with anonymous consumer → expect success + MARK.
  - Issue a 5.1 pointing at an existing issued 1.1 → expect success and
    the parent's MARK echoed back in Wrapp's response's
    `correlated_invoices`.
  - Issue a 5.1 with the manual MARK escape hatch → expect success.
  - Issue a 5.1 with neither parent nor manual MARK → expect our
    Greek-language validation error, no Wrapp round-trip.

## Files touched

New:
- `prisma/migrations/20260728000000_credit_note_correlated_and_simplified/migration.sql`
- `src/app/app/documents/CorrelatedInvoicePicker.tsx`

Modified:
- `prisma/schema.prisma`
- `src/lib/wrapp/mappings.ts`
- `src/app/app/documents/actions.ts` (attemptIssueAction + draftSchema +
  create/update handlers)
- `src/app/app/documents/DraftEditor.tsx` (DOC_TYPE_OPTIONS, correlated
  picker slot, prop plumbing)
- `src/app/app/documents/new/page.tsx` (prefetch)
- `src/app/app/documents/[id]/edit/page.tsx` (prefetch)

## Risk

- Credit-note flow already worked as 5.2. Splitting introduces a new
  enum value users must pick correctly; if they pick `credit_note`
  (5.2) when they wanted 5.1, Wrapp accepts but the audit trail is
  slightly weaker. Mitigation: dropdown label clarifies "συσχετιζόμενο"
  vs "μη συσχετιζόμενο" in plain Greek + adds the myDATA code.
- `correlatedMarkOverride` bypasses local doc integrity — if the user
  types a bogus MARK, Wrapp returns 422. Acceptable trade-off for the
  migration/import case.

## Out of scope (phase 2 candidates)

- 1.2 / 1.3 EU + third-country sales (needs currency + exchange rate).
- 2.2 / 2.3 EU + third-country services.
- 8.2 stay-tax receipts (needs stay-tax block).
- 3.1 τίτλος κτήσης.
- 6.1 / 6.2 self-supply / self-use.
- 13.x / 14.x tax adjustments.
- Self-billing (αυτοτιμολόγιση) flag on any type.
