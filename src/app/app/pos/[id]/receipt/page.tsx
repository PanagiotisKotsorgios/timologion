import { notFound } from "next/navigation";
import { ExternalLink, FileText, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { money, date } from "@/lib/format";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  cash: "Μετρητά",
  card: "Κάρτα",
  bank_transfer: "Τραπεζική",
  iris: "IRIS",
  other: "Άλλο",
};

export default async function ThermalReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");
  const { id } = await params;

  const [tab, business] = await Promise.all([
    prisma.posTab.findFirst({
      where: { id, businessId: ctx.businessId },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        table: true,
      },
    }),
    prisma.business.findUnique({ where: { id: ctx.businessId } }),
  ]);

  if (!tab || !business) notFound();

  // If this tab issued a Document to Wrapp, prefer showing the OFFICIAL
  // thermal PDF from the provider instead of the local mock template.
  // The local template stays visible below as a preview / backup.
  const linkedDoc = tab.documentId
    ? await prisma.document.findUnique({
        where: { id: tab.documentId },
        select: {
          id: true,
          status: true,
          wrappInvoiceId: true,
          wrappInvoiceUrl: true,
          myDataMark: true,
          series: true,
          number: true,
        },
      })
    : null;
  const isWrappIssued =
    !!linkedDoc &&
    linkedDoc.status === "issued" &&
    !!linkedDoc.wrappInvoiceId;
  const wrappThermalUrl = isWrappIssued
    ? `/app/documents/${linkedDoc.id}/thermal-pdf`
    : null;

  return (
    <div className="min-h-screen bg-ink-100 p-4 print:bg-white print:p-0">
      <div className="mx-auto max-w-[80mm]">
        <div className="mb-4 flex justify-between print:hidden">
          <a
            href={`/app/pos/${tab.id}`}
            className="text-sm font-semibold text-brand-800 hover:text-brand-900"
          >
            ← Πίσω
          </a>
          {isWrappIssued && wrappThermalUrl && (
            <PrintButton thermalPdfUrl={wrappThermalUrl} />
          )}
        </div>

        {/* Wrapp official PDF banner — shown when the document has been
            issued upstream. This is the receipt the customer should get;
            we never render a local template for a customer-facing print. */}
        {isWrappIssued && wrappThermalUrl && (
          <div className="mb-4 rounded-lg border-2 border-emerald-500 bg-emerald-50 p-3 text-[12px] text-emerald-900 print:hidden">
            <p className="flex items-center gap-1.5 font-black uppercase tracking-widest text-emerald-800">
              <FileText size={13} strokeWidth={2.5} aria-hidden />
              Επίσημη απόδειξη Wrapp
            </p>
            <p className="mt-1">
              Η απόδειξη έχει σταλεί στην ΑΑΔΕ.
              {linkedDoc?.myDataMark && (
                <>
                  {" "}MARK{" "}
                  <span className="mono font-bold">{linkedDoc.myDataMark}</span>
                </>
              )}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={wrappThermalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border-2 border-emerald-700 bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <FileText size={12} strokeWidth={2.5} aria-hidden />
                Θερμικό PDF
              </a>
              {linkedDoc?.wrappInvoiceUrl && (
                <a
                  href={linkedDoc.wrappInvoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border-2 border-brand-800 bg-brand-700 px-3 text-xs font-bold text-white hover:bg-brand-800"
                >
                  <ExternalLink size={12} strokeWidth={2.5} aria-hidden />
                  Πλήρες παραστατικό
                </a>
              )}
            </div>
          </div>
        )}
        {!isWrappIssued && (
          <div className="rounded-2xl border-2 border-amber-400 bg-white p-6 shadow-card print:hidden">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-800">
                <ShieldAlert size={22} strokeWidth={2.5} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-base font-black text-amber-900">
                  Δεν έχει εκδοθεί επίσημη απόδειξη
                </p>
                <p className="mt-1 text-sm text-ink-800">
                  Για συμμόρφωση με τη νομοθεσία, η απόδειξη πρέπει να
                  διαβιβαστεί στο myDATA μέσω του παρόχου (Wrapp) και μόνο
                  τότε τυπώνεται. Δεν δείχνουμε πρόχειρη έκδοση εδώ για
                  να μη δοθεί κατά λάθος στον πελάτη.
                </p>
                {linkedDoc ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={`/app/documents/${linkedDoc.id}`}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-brand-800 bg-brand-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-brand-800"
                    >
                      <ExternalLink size={14} strokeWidth={2.5} aria-hidden />
                      Άνοιγμα παραστατικού
                    </a>
                    <a
                      href={`/app/pos/${tab.id}`}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-ink-300 bg-white px-4 text-sm font-bold text-ink-900 hover:bg-ink-100"
                    >
                      Πίσω στο ταμείο
                    </a>
                  </div>
                ) : (
                  <div className="mt-4">
                    <a
                      href={`/app/pos/${tab.id}`}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-ink-300 bg-white px-4 text-sm font-bold text-ink-900 hover:bg-ink-100"
                    >
                      Πίσω στο ταμείο
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Compact internal-only summary. Clearly labeled and styled so
                it can't be mistaken for the customer receipt. */}
            <div className="mt-6 rounded-lg border border-dashed border-ink-300 bg-ink-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
                Εσωτερική περίληψη λογαριασμού
              </p>
              <dl className="mt-2 space-y-1 text-xs text-ink-800">
                <div className="flex justify-between">
                  <dt>Τραπέζι / λογαριασμός</dt>
                  <dd className="font-bold">
                    {tab.table?.label ?? tab.label ?? tab.id.slice(-6)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Ημ/νία</dt>
                  <dd className="mono">{date(tab.closedAt ?? tab.openedAt)}</dd>
                </div>
                {tab.paymentMethod && (
                  <div className="flex justify-between">
                    <dt>Πληρωμή</dt>
                    <dd>
                      {METHOD_LABEL[tab.paymentMethod] ?? tab.paymentMethod}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-ink-200 pt-1">
                  <dt>Σύνολο</dt>
                  <dd className="font-black text-brand-900">
                    {money(tab.total)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {isWrappIssued && (
          <div className="rounded-lg bg-white p-4 font-mono text-[11px] leading-tight text-black shadow print:rounded-none print:shadow-none">
            <div className="text-center">
              <p className="text-sm font-bold uppercase">
                {business.legalName}
              </p>
              {business.tradeName && (
                <p className="text-[10px]">{business.tradeName}</p>
              )}
              <p className="text-[10px]">
                ΑΦΜ {business.vatNumber}
                {business.taxOffice ? ` · ${business.taxOffice}` : ""}
              </p>
              {business.addressLine && (
                <p className="text-[10px]">
                  {business.addressLine}
                  {business.city ? `, ${business.city}` : ""}
                </p>
              )}
              {business.phone && (
                <p className="text-[10px]">Τηλ {business.phone}</p>
              )}
            </div>

            <div className="my-2 border-t border-dashed border-black" />

            <div className="flex justify-between">
              <span>Λογαριασμός:</span>
              <span>{tab.table?.label ?? tab.label ?? tab.id.slice(-6)}</span>
            </div>
            <div className="flex justify-between">
              <span>Ημ/νία:</span>
              <span>{date(tab.closedAt ?? tab.openedAt)}</span>
            </div>
            {tab.paymentMethod && (
              <div className="flex justify-between">
                <span>Πληρωμή:</span>
                <span>
                  {METHOD_LABEL[tab.paymentMethod] ?? tab.paymentMethod}
                </span>
              </div>
            )}
            {linkedDoc?.myDataMark && (
              <div className="flex justify-between">
                <span>MARK:</span>
                <span className="mono">{linkedDoc.myDataMark}</span>
              </div>
            )}

            <div className="my-2 border-t border-dashed border-black" />

            {tab.items.map((it) => {
              const rowTotal =
                Number(it.quantity) *
                Number(it.unitPrice) *
                (1 + Number(it.vatRate) / 100);
              return (
                <div key={it.id} className="mb-1">
                  <p className="font-bold">{it.name}</p>
                  <div className="flex justify-between">
                    <span>
                      {Number(it.quantity)} × {money(it.unitPrice)}
                    </span>
                    <span>{money(rowTotal)}</span>
                  </div>
                </div>
              );
            })}

            <div className="my-2 border-t border-dashed border-black" />

            <div className="flex justify-between">
              <span>Καθαρή:</span>
              <span>{money(tab.netTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>ΦΠΑ:</span>
              <span>{money(tab.vatTotal)}</span>
            </div>
            <div className="my-1 border-t border-black" />
            <div className="flex justify-between text-sm font-bold">
              <span>ΣΥΝΟΛΟ:</span>
              <span>{money(tab.total)}</span>
            </div>

            <div className="my-2 border-t border-dashed border-black" />

            {linkedDoc?.series && linkedDoc?.number && (
              <p className="text-center text-[10px]">
                Παραστατικό: {linkedDoc.series} #{linkedDoc.number}
              </p>
            )}
            <p className="mt-2 text-center text-[10px] text-black/70">
              Ευχαριστούμε — Πάροχος myDATA: Wrapp
            </p>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0; }
        }
      `}</style>
    </div>
  );
}
