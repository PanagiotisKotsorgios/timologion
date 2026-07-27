import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { ensureDefaultBillingBook } from "@/lib/billing-books";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Repeat } from "lucide-react";
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

  // First-use auto-seed: guarantee at least one billing book (series) for
  // the type the user is about to work on. Idempotent, safe on every load.
  await ensureDefaultBillingBook(ctx.businessId, initialType);

  // `defaultDocumentNotes` is a recent schema column; guard against a
  // running container that hasn't picked up the migration yet.
  async function loadBusiness() {
    try {
      return await prisma.business.findUniqueOrThrow({
        where: { id: ctx.businessId },
        select: {
          legalName: true,
          tradeName: true,
          defaultDocumentNotes: true,
        },
      });
    } catch {
      const b = await prisma.business.findUniqueOrThrow({
        where: { id: ctx.businessId },
        select: { legalName: true, tradeName: true },
      });
      return { ...b, defaultDocumentNotes: null as string | null };
    }
  }

  const [business, clients, items, branches, books] = await Promise.all([
    loadBusiness(),
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
        actions={
          <LinkButton
            href="/app/documents/repeating/new"
            variant="secondary"
            icon={Repeat}
          >
            Το ίδιο κάθε μήνα;
          </LinkButton>
        }
      />
      <DraftEditor
        initialType={initialType}
        businessName={business.tradeName ?? business.legalName}
        defaultNotes={business.defaultDocumentNotes ?? ""}
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
