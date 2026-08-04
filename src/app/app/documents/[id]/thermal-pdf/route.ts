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
 * Serve the OFFICIAL 80mm thermal PDF for an issued document. We ask
 * Wrapp for a short-lived S3 download URL, then STREAM the bytes back
 * to the caller ourselves. Two reasons:
 *
 *   1. AWS S3 presigned URLs set `Content-Disposition: attachment` and
 *      `x-frame-options` headers that stop browsers from embedding the
 *      PDF in an <iframe>. Proxying rewrites both so the receipt page
 *      can preview the doc inline.
 *   2. Everything the customer sees stays under our origin, no third-
 *      party network calls leaking from the browser.
 *
 * `?redirect=1` keeps the legacy 302 behavior for CLI / API callers
 * that would rather follow the redirect than stream 100kB of PDF.
 */
export async function GET(
  req: Request,
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
      series: true,
      number: true,
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

    if (!res.download_url) {
      return NextResponse.json(
        {
          status: "pending",
          error:
            "Η θερμική απόδειξη βρίσκεται σε επεξεργασία. Δοκίμασε ξανά σε λίγα δευτερόλεπτα.",
        },
        { status: 202 },
      );
    }

    await logAudit({
      userId: ctx.userId,
      businessId: ctx.businessId,
      action: "document.thermal_pdf.fetched",
      entityType: "Document",
      entityId: doc.id,
    });

    const wantsRedirect = new URL(req.url).searchParams.get("redirect") === "1";
    if (wantsRedirect) {
      return NextResponse.redirect(res.download_url, 302);
    }

    // Stream the S3 payload through our origin. AbortController wires
    // the client disconnect to the upstream fetch so we don't waste a
    // connection when the user navigates away mid-download.
    const controller = new AbortController();
    req.signal.addEventListener("abort", () => controller.abort());

    const upstream = await fetch(res.download_url, {
      signal: controller.signal,
    });
    if (!upstream.ok || !upstream.body) {
      throw new Error(`upstream ${upstream.status}`);
    }

    const filename = filenameFor(doc);
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${filename}"`,
        // Aggressively short — the S3 URL itself only lives ~7 days.
        "cache-control": "private, max-age=60",
        // Explicit "yes you can embed me" so browsers don't apply
        // conservative defaults on the response.
        "x-frame-options": "SAMEORIGIN",
        "content-security-policy": "frame-ancestors 'self'",
      },
    });
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

function filenameFor(doc: {
  id: string;
  series: string | null;
  number: number | null;
}): string {
  const stem =
    doc.series && doc.number != null
      ? `${doc.series}-${doc.number}`
      : doc.id.slice(-8);
  // Basic sanitizer — S3 sometimes returns exotic UTF-8 filenames the
  // Content-Disposition header can't carry without RFC 5987 encoding.
  return `apodeixi-${stem.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`;
}
