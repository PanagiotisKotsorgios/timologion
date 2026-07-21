import "server-only";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Atomically reserve the next serial number for a BillingBook.
 *
 * MySQL doesn't expose SERIALIZABLE cleanly through Prisma, so we take a
 * pessimistic row-level lock via `UPDATE ... WHERE id = ? AND nextNumber = ?`
 * inside a transaction — if another writer already bumped the number, the
 * update matches 0 rows and we retry a few times. This is safe under
 * concurrent issuers.
 *
 * Returns { series, number } to stamp on the Document. If the book cannot be
 * found or has been detached from the business, returns null.
 */
export async function reserveNextNumber(
  tx: Prisma.TransactionClient,
  billingBookId: string,
  businessId: string,
): Promise<{ series: string; number: number } | null> {
  // Small bounded retry loop — realistically converges in 1–2 attempts.
  for (let attempt = 0; attempt < 5; attempt++) {
    const book = await tx.billingBook.findFirst({
      where: { id: billingBookId, businessId },
      select: { id: true, series: true, nextNumber: true },
    });
    if (!book) return null;

    const reserved = book.nextNumber;
    const res = await tx.billingBook.updateMany({
      where: { id: book.id, nextNumber: reserved },
      data: { nextNumber: reserved + 1 },
    });

    if (res.count === 1) {
      return { series: book.series, number: reserved };
    }
    // Otherwise a concurrent writer beat us; loop and re-read.
  }
  throw new Error(
    "Αποτυχία δέσμευσης αριθμού παραστατικού: πολλές παράλληλες προσπάθειες.",
  );
}
