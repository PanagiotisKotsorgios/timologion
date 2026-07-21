import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { t } from "@/lib/i18n";
import { date, money } from "@/lib/format";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");

  const { id } = await params;

  const [doc, business] = await Promise.all([
    prisma.document.findFirst({
      where: { id, businessId: ctx.businessId },
      include: {
        client: true,
        lines: { orderBy: { ordinal: "asc" } },
        branch: true,
      },
    }),
    prisma.business.findUniqueOrThrow({
      where: { id: ctx.businessId },
    }),
  ]);
  if (!doc) notFound();

  const header = doc.branch ?? {
    label: business.legalName,
    addressLine: business.addressLine,
    postalCode: business.postalCode,
    city: business.city,
    phone: business.phone,
  };

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-ink-900 print:p-0">
      <style>{`
        @media print {
          @page { size: A4; margin: 16mm; }
          body { background: #fff; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print mb-4 flex items-center justify-between text-sm">
        <Link href={`/app/documents/${doc.id}`} className="text-brand-700">
          ← Πίσω στο παραστατικό
        </Link>
        <PrintButton />
      </div>

      <header className="flex items-start justify-between border-b border-ink-300 pb-4">
        <div>
          <h1 className="text-lg font-semibold">
            {business.tradeName ?? business.legalName}
          </h1>
          <p className="text-sm text-ink-700">{business.legalName}</p>
          <p className="text-xs text-ink-500">
            ΑΦΜ {business.vatNumber}
            {business.taxOffice ? ` · ${business.taxOffice}` : ""}
          </p>
          {header.addressLine && (
            <p className="mt-1 text-xs text-ink-500">
              {[header.addressLine, header.postalCode, header.city]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>
        <div className="text-right text-sm">
          <p className="text-xs uppercase tracking-wide text-ink-500">
            {t.documents.types[doc.type]}
          </p>
          <p className="mt-1 font-mono text-lg font-semibold">
            {doc.series ?? ""}
            {doc.number ? ` #${doc.number}` : ""}
          </p>
          <p className="text-xs text-ink-500">{date(doc.issueDate)}</p>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Πελάτης
          </p>
          {doc.client ? (
            <>
              <p className="mt-1 font-medium">{doc.client.legalName}</p>
              {doc.client.vatNumber && (
                <p className="text-xs text-ink-500">
                  ΑΦΜ {doc.client.vatNumber}
                  {doc.client.taxOffice ? ` · ${doc.client.taxOffice}` : ""}
                </p>
              )}
              {doc.client.addressLine && (
                <p className="text-xs text-ink-500">
                  {[
                    doc.client.addressLine,
                    doc.client.postalCode,
                    doc.client.city,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-500">Λιανική / Χωρίς πελάτη</p>
          )}
        </div>
        <div className="text-right">
          {doc.myDataMark && (
            <p className="text-xs">
              <span className="text-ink-500">MARK:</span>{" "}
              <span className="font-mono">{doc.myDataMark}</span>
            </p>
          )}
          {doc.myDataUid && (
            <p className="text-xs">
              <span className="text-ink-500">UID:</span>{" "}
              <span className="font-mono">{doc.myDataUid}</span>
            </p>
          )}
          {doc.myDataQrUrl && (
            <p className="mt-1 text-xs text-ink-500">QR: {doc.myDataQrUrl}</p>
          )}
        </div>
      </section>

      <table className="mt-6 w-full text-sm">
        <thead className="border-b border-ink-300 text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th className="py-2 text-left">Περιγραφή</th>
            <th className="py-2 text-right">Ποσ.</th>
            <th className="py-2 text-right">Τιμή</th>
            <th className="py-2 text-right">ΦΠΑ</th>
            <th className="py-2 text-right">Σύνολο</th>
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((l) => (
            <tr key={l.id} className="border-b border-ink-100">
              <td className="py-2 pr-4">{l.description}</td>
              <td className="py-2 text-right">
                {l.quantity.toString()} {l.unit}
              </td>
              <td className="py-2 text-right">{money(l.unitPrice)}</td>
              <td className="py-2 text-right">{l.vatRate.toString()}%</td>
              <td className="py-2 text-right font-medium">
                {money(l.totalAmount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="pt-3 text-right text-ink-500">
              Καθαρή αξία
            </td>
            <td className="pt-3 text-right font-medium">
              {money(doc.netTotalAmount)}
            </td>
          </tr>
          <tr>
            <td colSpan={4} className="pt-1 text-right text-ink-500">
              ΦΠΑ
            </td>
            <td className="pt-1 text-right font-medium">
              {money(doc.vatTotalAmount)}
            </td>
          </tr>
          <tr>
            <td
              colSpan={4}
              className="border-t border-ink-300 pt-2 text-right text-ink-900"
            >
              Σύνολο
            </td>
            <td className="border-t border-ink-300 pt-2 text-right text-base font-semibold">
              {money(doc.totalAmount)}
            </td>
          </tr>
        </tfoot>
      </table>

      {doc.notes && (
        <section className="mt-6 whitespace-pre-line text-sm text-ink-700">
          {doc.notes}
        </section>
      )}

      <footer className="mt-10 border-t border-ink-300 pt-4 text-xs text-ink-500">
        <p>{t.brand.providerNote}</p>
        {doc.wrappInvoiceUrl && (
          <p className="mt-1">
            Επίσημη έκδοση παρόχου: {doc.wrappInvoiceUrl}
          </p>
        )}
      </footer>
    </div>
  );
}
