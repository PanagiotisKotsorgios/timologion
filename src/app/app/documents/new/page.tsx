import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { DraftEditor } from "../DraftEditor";
import type { DocumentType } from "@prisma/client";

const VALID_TYPES: readonly DocumentType[] = [
  "invoice",
  "service_invoice",
  "retail_receipt",
  "service_receipt",
  "credit_note",
  "proforma",
  "quote",
  "order",
  "delivery_note",
];

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");

  const { type } = await searchParams;
  const initialType = (VALID_TYPES.find((t) => t === type) ??
    "invoice") as DocumentType;

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
        title="Έκδοση Παραστατικού"
        subtitle="Συμπλήρωσε τα στοιχεία και αποθήκευσε ως πρόχειρο."
      />
      <DraftEditor
        initialType={initialType}
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
      />
    </>
  );
}
