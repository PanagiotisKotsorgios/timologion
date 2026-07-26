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
 * Serve the official PDF for an issued document. Never rendered locally —
 * we always redirect to the provider's own PDF so what the recipient sees
 * exactly matches what myDATA has on file. Rules:
 *
 *   1. Draft / not-yet-transmitted docs → 409. Callers must transmit first.
 *   2. Cached `wrappInvoiceUrl` on the row → 302 redirect right away.
 *   3. Otherwise call the provider's `generate_pdf` endpoint:
 *        - If it hands back a `download_url`, cache it and 302.
 *        - If it says the job is queued, respond with 202 + a Greek message
 *          telling the user to retry in a few seconds.
 *
 * The previous pdfkit-based local renderer is intentionally NOT called
 * anywhere in this file — we don't want the app producing a compliance-
 * relevant document under its own name.
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
      wrappInvoiceUrl: true,
      wrappInvoiceUrlEn: true,
      printLanguage: true,
    },
  });
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Only transmitted / cancelled docs have an official PDF. Drafts and
  // failed attempts have nothing on the provider side yet.
  if (doc.status !== "issued" && doc.status !== "cancelled") {
    return NextResponse.json(
      {
        error:
          "Το επίσημο PDF είναι διαθέσιμο μόνο μετά τη διαβίβαση στο myDATA.",
      },
      { status: 409 },
    );
  }

  const wantsEn = doc.printLanguage === "en";
  const cached = wantsEn ? doc.wrappInvoiceUrlEn : doc.wrappInvoiceUrl;
  if (cached) {
    await logAudit({
      userId: ctx.userId,
      businessId: ctx.businessId,
      action: "document.pdf.cache_hit",
      entityType: "Document",
      entityId: doc.id,
    });
    return NextResponse.redirect(cached, 302);
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
    const res = await getWrappClient().generatePdf(
      ctx.businessId,
      doc.wrappInvoiceId,
      wantsEn ? "en" : "el",
    );

    if (res.download_url) {
      // Cache the URL so the next click is a straight redirect with no
      // upstream call.
      await prisma.document
        .update({
          where: { id: doc.id },
          data: wantsEn
            ? { wrappInvoiceUrlEn: res.download_url }
            : { wrappInvoiceUrl: res.download_url },
        })
        .catch(() => undefined);
      await logAudit({
        userId: ctx.userId,
        businessId: ctx.businessId,
        action: "document.pdf.fetched",
        entityType: "Document",
        entityId: doc.id,
      });
      return NextResponse.redirect(res.download_url, 302);
    }

    // Queued: myDATA hasn't finished. The client can retry — the provider
    // will eventually POST a webhook with the URL, which our webhook route
    // persists onto the document row.
    return NextResponse.json(
      {
        status: "pending",
        error:
          "Το επίσημο PDF βρίσκεται σε επεξεργασία. Δοκίμασε ξανά σε λίγα δευτερόλεπτα.",
      },
      { status: 202 },
    );
  } catch (err) {
    logger.error("document.pdf.fetch_failed", err, {
      businessId: ctx.businessId,
      documentId: doc.id,
    });
    return NextResponse.json(
      {
        error:
          "Αποτυχία λήψης του επίσημου PDF από τον πάροχο. Δοκίμασε ξανά σε λίγο.",
      },
      { status: 502 },
    );
  }
}
