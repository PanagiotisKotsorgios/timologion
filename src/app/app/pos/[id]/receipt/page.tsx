import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, RefreshCw, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { money, date } from "@/lib/format";
import { getWrappClient } from "@/lib/wrapp/client";
import { logger } from "@/lib/logger";
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

  // Check whether Wrapp has the PDF ready. If yes, point the iframe at
  // our own /thermal-pdf proxy — that route re-streams the bytes from
  // S3 with headers that browsers accept for embedding. AWS presigned
  // URLs otherwise ship with Content-Disposition:attachment and no
  // frame-ancestors, which Chrome and Safari refuse to render. If Wrapp
  // says "queued" we render a spinner + meta-refresh instead.
  let embedUrl: string | null = null;
  let pdfPending = false;
  if (isWrappIssued && linkedDoc?.wrappInvoiceId) {
    try {
      const res = await getWrappClient().generateThermalPdf(
        ctx.businessId,
        linkedDoc.wrappInvoiceId,
      );
      if (res.download_url) {
        embedUrl = `/app/documents/${linkedDoc.id}/thermal-pdf`;
      } else {
        pdfPending = true;
      }
    } catch (err) {
      logger.error("pos.receipt.thermal_pdf_fetch_failed", err, {
        businessId: ctx.businessId,
        documentId: linkedDoc.id,
      });
    }
  }

  return (
    <div className="min-h-screen bg-ink-100 p-4 print:bg-white print:p-0">
      {/* Meta-refresh only when the PDF is still being generated upstream.
          10s is Wrapp's typical async window for thermal_pdf. */}
      {pdfPending && (
        <meta httpEquiv="refresh" content="10" />
      )}

      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <a
            href={`/app/pos/${tab.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 hover:text-brand-900"
          >
            <ArrowLeft size={14} strokeWidth={2.5} aria-hidden />
            Πίσω
          </a>
          {embedUrl && <PrintButton thermalPdfUrl={embedUrl} />}
        </div>

        {/* NOT issued — no compliance-relevant receipt exists yet, don't
            pretend one does. Show a clear warning + a link to issue it. */}
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
                  τότε τυπώνεται.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {linkedDoc && (
                    <a
                      href={`/app/documents/${linkedDoc.id}`}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-brand-800 bg-brand-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-brand-800"
                    >
                      <ExternalLink size={14} strokeWidth={2.5} aria-hidden />
                      Άνοιγμα παραστατικού
                    </a>
                  )}
                  <a
                    href={`/app/pos/${tab.id}`}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-ink-300 bg-white px-4 text-sm font-bold text-ink-900 hover:bg-ink-100"
                  >
                    Πίσω στο ταμείο
                  </a>
                </div>
              </div>
            </div>

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

        {/* Issued but PDF still cooking — meta-refresh will re-run this
            server component every 10s until Wrapp hands back a URL. */}
        {isWrappIssued && pdfPending && (
          <div className="rounded-2xl border-2 border-brand-300 bg-white p-8 text-center shadow-card print:hidden">
            <RefreshCw
              size={28}
              className="mx-auto animate-spin text-brand-700"
              aria-hidden
            />
            <p className="mt-3 text-base font-black text-brand-900">
              Ετοιμάζεται η επίσημη απόδειξη...
            </p>
            <p className="mt-1 text-sm text-ink-700">
              Η Wrapp τη δημιουργεί αυτή τη στιγμή. Η σελίδα θα ανανεωθεί
              μόνη της σε λίγα δευτερόλεπτα.
              {linkedDoc?.myDataMark && (
                <>
                  {" "}MARK <span className="mono font-bold">{linkedDoc.myDataMark}</span>
                </>
              )}
            </p>
          </div>
        )}

        {/* Issued + PDF ready — embed the actual Wrapp PDF directly.
            iframe > object because iframes handle third-party PDFs
            consistently across browsers, including on iPad. */}
        {isWrappIssued && embedUrl && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-emerald-500 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 print:hidden">
              <p className="font-black uppercase tracking-widest">
                Επίσημη απόδειξη Wrapp
                {linkedDoc?.myDataMark && (
                  <>
                    {" · "}MARK{" "}
                    <span className="mono">{linkedDoc.myDataMark}</span>
                  </>
                )}
              </p>
              {linkedDoc?.wrappInvoiceUrl && (
                <a
                  href={linkedDoc.wrappInvoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border-2 border-brand-800 bg-brand-700 px-2 text-[11px] font-bold text-white hover:bg-brand-800"
                >
                  <ExternalLink size={11} strokeWidth={2.5} aria-hidden />
                  Πλήρες παραστατικό
                </a>
              )}
            </div>
            <div className="overflow-hidden rounded-lg border-2 border-ink-300 bg-white shadow-card print:rounded-none print:border-0 print:shadow-none">
              <iframe
                src={embedUrl}
                title="Επίσημη απόδειξη Wrapp"
                className="block h-[80vh] w-full print:h-auto print:min-h-screen"
                allow="fullscreen"
              />
            </div>
          </>
        )}
      </div>

      <style>{`
        @media print {
          body { margin: 0; }
          iframe { border: 0; }
        }
      `}</style>
    </div>
  );
}
