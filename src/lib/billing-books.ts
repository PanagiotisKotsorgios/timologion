import "server-only";
import type { DocumentType } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Default series (Greek convention + Wrapp mapping) for each supported
 * document type. Latin letters where possible because Wrapp's staging
 * validator rejects Greek series with a 422.
 */
const DEFAULT_SERIES: Record<DocumentType, string> = {
  invoice: "A",
  service_invoice: "P",
  retail_receipt: "R",
  service_receipt: "S",
  credit_note: "C",
  proforma: "PF",
  quote: "Q",
  order: "O",
  delivery_note: "D",
};

const DEFAULT_LABEL: Record<DocumentType, string> = {
  invoice: "Τιμολόγια πώλησης",
  service_invoice: "Τιμολόγια παροχής υπηρεσιών",
  retail_receipt: "Αποδείξεις λιανικής",
  service_receipt: "Αποδείξεις παροχής υπηρεσιών",
  credit_note: "Πιστωτικά",
  proforma: "Προτιμολόγια",
  quote: "Προσφορές",
  order: "Παραγγελίες",
  delivery_note: "Δελτία αποστολής",
};

/**
 * Idempotently ensure a business has at least one billing book for the given
 * document type. Called by the document editors so a fresh user can go from
 * signup → new document without ever visiting Settings → Σειρές παραστατικών.
 *
 * Safe to call concurrently — the underlying `@@unique([businessId,
 * documentType, series])` constraint deduplicates, and a race that races both
 * lookups finds the same row on the second read.
 */
export async function ensureDefaultBillingBook(
  businessId: string,
  documentType: DocumentType,
): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.billingBook.findFirst({
    where: { businessId, documentType },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  const series = DEFAULT_SERIES[documentType];
  const label = DEFAULT_LABEL[documentType];

  // Any existing book for another type doesn't block this — the unique key is
  // (businessId, documentType, series), so different types share letters
  // freely.
  try {
    const created = await prisma.billingBook.create({
      data: {
        businessId,
        documentType,
        series,
        label,
        isDefault: true,
        nextNumber: 1,
      },
      select: { id: true },
    });
    return { id: created.id, created: true };
  } catch {
    // Lost a race — read the winner.
    const raced = await prisma.billingBook.findFirst({
      where: { businessId, documentType },
      select: { id: true },
    });
    if (raced) return { id: raced.id, created: false };
    throw new Error("Failed to ensure default billing book.");
  }
}
