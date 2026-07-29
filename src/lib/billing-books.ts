import "server-only";
import type { DocumentType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getWrappClient, WrappApiError } from "@/lib/wrapp/client";
import { logger } from "@/lib/logger";

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
  simplified_invoice: "SI",
  eu_sale_invoice: "AE",
  third_country_sale_invoice: "A3",
  eu_service_invoice: "PE",
  third_country_service_invoice: "P3",
  credit_note: "C",
  credit_note_correlated: "CC",
  delivery_note: "D",
  stay_tax_receipt: "ST",
  proforma: "PF",
  quote: "Q",
  order: "O",
};

const DEFAULT_LABEL: Record<DocumentType, string> = {
  invoice: "Τιμολόγια πώλησης",
  service_invoice: "Τιμολόγια παροχής υπηρεσιών",
  retail_receipt: "Αποδείξεις λιανικής",
  service_receipt: "Αποδείξεις παροχής υπηρεσιών",
  simplified_invoice: "Απλοποιημένα τιμολόγια",
  eu_sale_invoice: "Ενδοκοινοτικές πωλήσεις",
  third_country_sale_invoice: "Πωλήσεις τρίτων χωρών",
  eu_service_invoice: "Ενδοκοινοτικές παροχές υπηρεσιών",
  third_country_service_invoice: "Παροχές υπηρεσιών τρίτων χωρών",
  credit_note: "Πιστωτικά",
  credit_note_correlated: "Πιστωτικά (συσχετισμένα)",
  delivery_note: "Δελτία αποστολής",
  stay_tax_receipt: "Αποδείξεις φόρου διαμονής",
  proforma: "Προτιμολόγια",
  quote: "Προσφορές",
  order: "Παραγγελίες",
};

/**
 * Wrapp accepts only Latin/ASCII names for billing books in staging (the
 * validator rejects Greek characters with a 422). Match FishBill's mapping
 * so existing conventions carry over.
 */
const WRAPP_LATIN_NAME: Record<DocumentType, string> = {
  invoice: "Timologia Polisis",
  service_invoice: "Timologia Parochis",
  retail_receipt: "Apodeixeis Lianikis",
  service_receipt: "Apodeixeis Parochis",
  simplified_invoice: "Aplopoimeno Timologio",
  eu_sale_invoice: "Timologia Polisis EU",
  third_country_sale_invoice: "Timologia Polisis 3C",
  eu_service_invoice: "Timologia Parochis EU",
  third_country_service_invoice: "Timologia Parochis 3C",
  credit_note: "Pistotika NonCorrelated",
  credit_note_correlated: "Pistotika Correlated",
  delivery_note: "Deltia Apostolis",
  stay_tax_receipt: "Foros Diamonis",
  proforma: "Protimologia",
  quote: "Prosfores",
  order: "Paraggelies",
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

/**
 * Ensure a local BillingBook is synced with a Wrapp billing book. Called on
 * first issuance so users never see "σειρά δεν είναι συγχρονισμένη".
 *
 * Strategy:
 *   1. Fast path — book already has `wrappBookId`.
 *   2. Fetch the tenant's Wrapp books, look for one that matches the local
 *      series letter under the same invoice_type_code. Reuse it silently if
 *      found (covers the case where a book was created earlier by another
 *      caller or through Wrapp's UI).
 *   3. Otherwise POST /billing_books with an ASCII-safe name + our local
 *      series letter + starting number 1.
 *   4. On the 422 "name/series already used" race (per FishBill's audit
 *      doc), re-list and match by name OR series.
 *
 * Returns the Wrapp book id. Persists it locally before returning so
 * subsequent calls take the fast path.
 */
export async function ensureWrappBillingBookSynced(
  businessId: string,
  localBookId: string,
  invoiceTypeCode: string,
): Promise<{ wrappBookId: string; created: boolean } | { error: string }> {
  const book = await prisma.billingBook.findFirst({
    where: { id: localBookId, businessId },
    select: {
      id: true,
      documentType: true,
      series: true,
      wrappBookId: true,
      nextNumber: true,
    },
  });
  if (!book) return { error: "Η σειρά παραστατικών δεν βρέθηκε." };

  const client = getWrappClient();

  // Fast path: cache present AND the Wrapp book still exists at the expected
  // invoice_type_code. The type check is what catches stale cache after
  // enum mapping changes (e.g. credit_note flipped from 5.1 → 5.2 — any
  // wrappBookId cached before that change now points to the wrong type
  // and would 422 on the next issue).
  if (book.wrappBookId) {
    try {
      const list = await client.listBillingBooks(businessId);
      const cached = list.find((b) => b.id === book.wrappBookId);
      if (cached && cached.invoice_type_code === invoiceTypeCode) {
        return { wrappBookId: book.wrappBookId, created: false };
      }
      // Stale — clear locally and fall through to the reuse/create paths.
      await prisma.billingBook.update({
        where: { id: book.id },
        data: { wrappBookId: null },
      });
      logger.info("wrapp.billing_book.cache_invalidated", {
        businessId,
        localBookId: book.id,
        oldWrappBookId: book.wrappBookId,
        wantedType: invoiceTypeCode,
        actualType: cached?.invoice_type_code ?? "(missing)",
      });
    } catch {
      // Wrapp listing failed — trust the cache, let the subsequent issue
      // request surface the real error if there's a mismatch.
      return { wrappBookId: book.wrappBookId, created: false };
    }
  }

  // Try to reuse an existing Wrapp book for the same type + series letter.
  try {
    const existing = await client.listBillingBooks(businessId);
    const match =
      existing.find(
        (b) => b.invoice_type_code === invoiceTypeCode && b.series === book.series,
      ) ?? existing.find((b) => b.invoice_type_code === invoiceTypeCode);
    if (match) {
      await prisma.billingBook.update({
        where: { id: book.id },
        data: { wrappBookId: match.id },
      });
      logger.info("wrapp.billing_book.reused", {
        businessId,
        localBookId: book.id,
        wrappBookId: match.id,
        type: invoiceTypeCode,
      });
      return { wrappBookId: match.id, created: false };
    }
  } catch (err) {
    logger.warn("wrapp.billing_book.list_failed_before_create", {
      businessId,
      error: err instanceof Error ? err.message : String(err),
    });
    // Continue to create path.
  }

  const name = WRAPP_LATIN_NAME[book.documentType];
  try {
    const created = await client.createBillingBook(businessId, {
      name,
      series: book.series,
      number: book.nextNumber ?? 1,
      invoice_type_code: invoiceTypeCode,
    });
    await prisma.billingBook.update({
      where: { id: book.id },
      data: { wrappBookId: created.id },
    });
    logger.info("wrapp.billing_book.created", {
      businessId,
      localBookId: book.id,
      wrappBookId: created.id,
      type: invoiceTypeCode,
      series: book.series,
    });
    return { wrappBookId: created.id, created: true };
  } catch (err) {
    // Wrapp returns 422 with `{errors: [{title: "Name το έχουν ήδη …"}]}` when
    // a book with our proposed name or series already exists on their side.
    // Recover by re-listing and matching by name OR series.
    const httpStatus = err instanceof WrappApiError ? err.httpStatus : 0;
    const message = err instanceof Error ? err.message : String(err);
    const isDupe =
      httpStatus === 422 &&
      /το έχουν ήδη|already|χρησιμοποιήσει/i.test(message);
    if (!isDupe) {
      logger.error("wrapp.billing_book.create_failed", err, {
        businessId,
        localBookId: book.id,
      });
      return {
        error:
          "Αποτυχία δημιουργίας σειράς παραστατικών στη Wrapp. Δοκίμασε ξανά σε λίγο.",
      };
    }
    try {
      const list = await client.listBillingBooks(businessId);
      const dupeMatch =
        list.find((b) => b.name === name) ??
        list.find((b) => b.series === book.series);
      if (dupeMatch) {
        await prisma.billingBook.update({
          where: { id: book.id },
          data: { wrappBookId: dupeMatch.id },
        });
        logger.info("wrapp.billing_book.recovered_after_dupe", {
          businessId,
          localBookId: book.id,
          wrappBookId: dupeMatch.id,
        });
        return { wrappBookId: dupeMatch.id, created: false };
      }
      return {
        error:
          "Η σειρά υπάρχει ήδη στη Wrapp αλλά δεν εντοπίστηκε — δοκίμασε ξανά.",
      };
    } catch (listErr) {
      logger.error("wrapp.billing_book.recovery_list_failed", listErr, {
        businessId,
      });
      return {
        error: "Αποτυχία συγχρονισμού σειράς με τη Wrapp — δοκίμασε ξανά.",
      };
    }
  }
}
