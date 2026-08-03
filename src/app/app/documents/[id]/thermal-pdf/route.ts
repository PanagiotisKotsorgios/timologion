import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { getWrappClient } from "@/lib/wrapp/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serve the OFFICIAL 80mm thermal PDF for an issued document by
 * proxying Wrapp's `/invoices/:id/generate_thermal_pdf` endpoint.
 * Same contract as the A4 `/pdf` sibling route — we never render the
 * receipt locally so the customer always gets the exact document
 * that was diavivastei to myDATA.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");
  const { id } = await params;

  const doc = await prisma.document.findFirst({
    where: { id, businessId: ctx.businessId },
    select: {
      id: true,
      status: true,
      wrappInvoiceId: true,
    },
  });
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (doc.status !== "issued" && doc.status !== "cancelled") {
    return NextResponse.json(
      {
        error:
          "Η θερμική απόδειξη είναι διαθέσιμη μόνο μετά τη διαβίβαση στο myDATA.",
      },
      { status: 409 },
    );
  }

  if (!doc.wrappInvoiceId) {
    return NextResponse.json(
      {
        error:
          "Λείπει το αναγνωριστικό του παραστατικού στη Wrapp — δοκίμασε να ξαναδιαβιβάσεις.",
      },
      { status: 409 },
    );
  }

  try {
    const res = await getWrappClient().generateThermalPdf(
      ctx.businessId,
      doc.wrappInvoiceId,
    );

    if (res.download_url) {
      await logAudit({
        userId: ctx.userId,
        businessId: ctx.businessId,
        action: "document.thermal_pdf.fetched",
        entityType: "Document",
        entityId: doc.id,
      });
      return NextResponse.redirect(res.download_url, 302);
    }

    return NextResponse.json(
      {
        status: "pending",
        error:
          "Η θερμική απόδειξη βρίσκεται σε επεξεργασία. Δοκίμασε ξανά σε λίγα δευτερόλεπτα.",
      },
      { status: 202 },
    );
  } catch (err) {
    logger.error("document.thermal_pdf.fetch_failed", err, {
      businessId: ctx.businessId,
      documentId: doc.id,
    });
    return NextResponse.json(
      {
        error:
          "Αποτυχία λήψης της θερμικής απόδειξης από τον πάροχο. Δοκίμασε ξανά σε λίγο.",
      },
      { status: 502 },
    );
  }
}
