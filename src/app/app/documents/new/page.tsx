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

  // 12-month cutoff for the parent-invoice picker (5.1 credit notes).
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const [
    business,
    clients,
    items,
    branches,
    books,
    issuedDocsRaw,
  ] = await Promise.all([
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
    prisma.document.findMany({
      where: {
        businessId: ctx.businessId,
        status: "issued",
        myDataMark: { not: null },
        type: {
          notIn: [
            "credit_note",
            "credit_note_correlated",
            "delivery_note",
            "proforma",
            "quote",
            "order",
          ],
        },
        issueDate: { gte: twelveMonthsAgo },
      },
      orderBy: { issueDate: "desc" },
      take: 200,
      select: {
        id: true,
        series: true,
        number: true,
        issueDate: true,
        totalAmount: true,
        myDataMark: true,
        client: { select: { legalName: true, tradeName: true } },
      },
    }),
  ]);

  const issuedDocsForCorrelation = issuedDocsRaw
    .filter((d): d is typeof d & { myDataMark: string } => Boolean(d.myDataMark))
    .map((d) => ({
      id: d.id,
      label:
        (d.series ?? "") + (d.number != null ? ` #${d.number}` : "") ||
        d.id.slice(0, 8),
      issueDate: d.issueDate.toISOString(),
      clientName: d.client?.tradeName ?? d.client?.legalName ?? "—",
      totalAmount: Number(d.totalAmount),
      myDataMark: d.myDataMark,
    }));

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
        issuedDocsForCorrelation={issuedDocsForCorrelation}
      />
    </>
  );
}
