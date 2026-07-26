import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { DraftEditor } from "../../DraftEditor";

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");

  const { id } = await params;

  const doc = await prisma.document.findFirst({
    where: { id, businessId: ctx.businessId },
    include: { lines: { orderBy: { ordinal: "asc" } } },
  });
  if (!doc) notFound();
  if (doc.status !== "draft") {
    // Issued/cancelled documents can't be edited (myDATA rule); take the user
    // back to the detail view instead of showing them a dead editor.
    redirect(`/app/documents/${doc.id}`);
  }

  const [business, clients, items, branches, books] = await Promise.all([
    prisma.business.findUniqueOrThrow({
      where: { id: ctx.businessId },
      select: { legalName: true, tradeName: true },
    }),
    prisma.client.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { legalName: "asc" },
      take: 500,
      select: {
        id: true,
        legalName: true,
        tradeName: true,
        vatNumber: true,
        taxOffice: true,
        addressLine: true,
        city: true,
        postalCode: true,
        country: true,
        activity: true,
        email: true,
        phone: true,
      },
    }),
    prisma.item.findMany({
      where: { businessId: ctx.businessId, active: true },
      orderBy: { name: "asc" },
      take: 500,
      select: {
        id: true,
        name: true,
        unit: true,
        defaultPrice: true,
        vatRate: true,
      },
    }),
    prisma.branch.findMany({
      where: { businessId: ctx.businessId },
      orderBy: [{ isDefault: "desc" }, { label: "asc" }],
      select: { id: true, label: true, isDefault: true },
    }),
    prisma.billingBook.findMany({
      where: { businessId: ctx.businessId },
      orderBy: [
        { documentType: "asc" },
        { isDefault: "desc" },
        { series: "asc" },
      ],
      select: {
        id: true,
        series: true,
        label: true,
        documentType: true,
        branchId: true,
        isDefault: true,
        nextNumber: true,
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Επεξεργασία παραστατικού"
        subtitle="Ενημέρωσε τα στοιχεία και αποθήκευσε τις αλλαγές."
      />
      <DraftEditor
        initialType={doc.type}
        businessName={business.tradeName ?? business.legalName}
        clients={clients.map((c) => ({
          id: c.id,
          label: c.tradeName ?? c.legalName,
          vatNumber: c.vatNumber,
          taxOffice: c.taxOffice,
          addressLine: c.addressLine,
          city: c.city,
          postalCode: c.postalCode,
          country: c.country,
          activity: c.activity,
          email: c.email,
          phone: c.phone,
        }))}
        items={items.map((i) => ({
          id: i.id,
          name: i.name,
          unit: i.unit,
          defaultPrice: i.defaultPrice.toString(),
          vatRate: i.vatRate.toString(),
        }))}
        branches={branches}
        books={books}
        editing={{
          id: doc.id,
          type: doc.type,
          clientId: doc.clientId ?? "",
          branchId: doc.branchId ?? "",
          billingBookId: doc.billingBookId ?? "",
          issueDate: doc.issueDate.toISOString().slice(0, 10),
          deliveryNoteRef: doc.deliveryNoteRef ?? "",
          paymentMethod: doc.paymentMethod ?? "Μετρητά",
          printLanguage: (doc.printLanguage as "el" | "en") ?? "el",
          additionalTaxes: doc.additionalTaxes ?? "",
          notes: doc.notes ?? "",
          lines: doc.lines.map((l, idx) => ({
            key: idx,
            itemId: l.itemId ?? "",
            description: l.description,
            quantity: l.quantity.toString(),
            unit: l.unit,
            unitPrice: l.unitPrice.toString(),
            discountPct: l.discountPct.toString(),
            vatRate: l.vatRate.toString(),
          })),
        }}
      />
    </>
  );
}
