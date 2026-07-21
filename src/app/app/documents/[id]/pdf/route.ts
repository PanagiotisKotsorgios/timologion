import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { buildDocumentPdf } from "@/lib/pdf/document-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");
  const { id } = await params;

  const doc = await prisma.document.findFirst({
    where: { id, businessId: ctx.businessId },
    include: {
      client: true,
      lines: { orderBy: { ordinal: "asc" } },
      business: true,
    },
  });
  if (!doc) return notFound();

  const pdf = await buildDocumentPdf({
    business: {
      legalName: doc.business.legalName,
      tradeName: doc.business.tradeName,
      vatNumber: doc.business.vatNumber,
      taxOffice: doc.business.taxOffice,
      activity: doc.business.activity,
      addressLine: doc.business.addressLine,
      city: doc.business.city,
      postalCode: doc.business.postalCode,
      country: doc.business.country,
      phone: doc.business.phone,
      email: doc.business.email,
    },
    client: doc.client
      ? {
          legalName: doc.client.legalName,
          tradeName: doc.client.tradeName,
          vatNumber: doc.client.vatNumber,
          taxOffice: doc.client.taxOffice,
          addressLine: doc.client.addressLine,
          city: doc.client.city,
          postalCode: doc.client.postalCode,
          email: doc.client.email,
          activity: doc.client.activity,
        }
      : null,
    doc: {
      type: doc.type,
      status: doc.status,
      series: doc.series,
      number: doc.number,
      issueDate: doc.issueDate,
      paymentMethod: doc.paymentMethod,
      notes: doc.notes,
      netTotalAmount: doc.netTotalAmount,
      vatTotalAmount: doc.vatTotalAmount,
      totalAmount: doc.totalAmount,
      myDataMark: doc.myDataMark,
      myDataUid: doc.myDataUid,
      myDataQrUrl: doc.myDataQrUrl,
      wrappInvoiceUrl: doc.wrappInvoiceUrl,
    },
    lines: doc.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unitPrice: l.unitPrice,
      vatRate: l.vatRate,
      totalAmount: l.totalAmount,
    })),
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "document.pdf",
    entityType: "Document",
    entityId: doc.id,
  });

  const filename = `${doc.series ?? "doc"}${doc.number ? "-" + doc.number : ""}-${doc.id.slice(0, 6)}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
