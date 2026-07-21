import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Pencil,
  Printer,
  Eye,
  Mail,
  ExternalLink,
  FileDown,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan, can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { t } from "@/lib/i18n";
import { date, money } from "@/lib/format";
import { IssueButton } from "./IssueButton";
import { DuplicateButton, CreditNoteButton } from "./DocumentActions";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");

  const { id } = await params;

  const doc = await prisma.document.findFirst({
    where: { id, businessId: ctx.businessId },
    include: {
      client: true,
      lines: { orderBy: { ordinal: "asc" } },
      branch: { select: { label: true } },
    },
  });
  if (!doc) notFound();

  const isDraft = doc.status === "draft";
  const isIssued = doc.status === "issued";
  const mailtoHref = doc.client?.email
    ? `mailto:${doc.client.email}?subject=${encodeURIComponent(
        `Παραστατικό ${doc.series ?? ""}${doc.number ? " #" + doc.number : ""}`,
      )}`
    : null;

  return (
    <>
      <PageHeader
        title={t.documents.types[doc.type]}
        subtitle={`${date(doc.issueDate)}${doc.series ? " · σειρά " + doc.series : ""}${doc.number ? " #" + doc.number : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {isDraft && can(ctx.role, "document:write") && (
              <LinkButton
                href={`/app/documents/${doc.id}/edit`}
                variant="secondary"
                icon={Pencil}
              >
                Μεταβολή
              </LinkButton>
            )}
            <LinkButton
              href={`/app/documents/${doc.id}/print`}
              variant="secondary"
              icon={Eye}
            >
              Επισκόπηση
            </LinkButton>
            <LinkButton
              href={`/app/documents/${doc.id}/print`}
              variant="secondary"
              icon={Printer}
            >
              Εκτύπωση
            </LinkButton>
            <a
              href={`/app/documents/${doc.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-lg border-2 border-ink-300 bg-white px-5 text-base font-semibold text-ink-900 hover:border-ink-500 hover:bg-ink-100"
            >
              <FileDown size={18} aria-hidden />
              Λήψη PDF
            </a>
            {mailtoHref && (
              <LinkButton href={mailtoHref} variant="secondary" icon={Mail}>
                Αποστολή Email
              </LinkButton>
            )}
            {doc.wrappInvoiceUrl && (
              <a
                href={doc.wrappInvoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-lg border-2 border-ink-300 bg-white px-5 text-base font-semibold text-ink-900 hover:border-ink-500 hover:bg-ink-100"
              >
                <ExternalLink size={18} aria-hidden />
                Δημόσιος σύνδεσμος
              </a>
            )}
            {(isDraft || isIssued) && can(ctx.role, "document:write") && (
              <DuplicateButton documentId={doc.id} />
            )}
            {isIssued && can(ctx.role, "document:write") && (
              <CreditNoteButton documentId={doc.id} />
            )}
            {isDraft && can(ctx.role, "document:issue") && (
              <IssueButton documentId={doc.id} />
            )}
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Πελάτης"
              action={
                doc.client && (
                  <Link
                    href={`/app/clients/${doc.client.id}`}
                    className="text-sm font-semibold text-brand-800 hover:text-brand-900"
                  >
                    Καρτέλα →
                  </Link>
                )
              }
            />
            <CardBody>
              {doc.client ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <ClientField
                    label="Επωνυμία"
                    value={doc.client.legalName}
                    className="md:col-span-2"
                  />
                  <ClientField label="ΑΦΜ" value={doc.client.vatNumber ?? "—"} />
                  <ClientField label="ΔΟΥ" value={doc.client.taxOffice ?? "—"} />
                  <ClientField
                    label="Πόλη"
                    value={doc.client.city ?? "—"}
                  />
                  <ClientField label="Τ.Κ." value={doc.client.postalCode ?? "—"} />
                  <ClientField
                    label="Διεύθυνση"
                    value={doc.client.addressLine ?? "—"}
                    className="md:col-span-3"
                  />
                  <ClientField
                    label="Δραστηριότητα"
                    value={doc.client.activity ?? "—"}
                    className="md:col-span-2"
                  />
                  <ClientField label="Email" value={doc.client.email ?? "—"} />
                </div>
              ) : (
                <p className="text-base text-ink-700">Λιανική / Χωρίς πελάτη</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Γραμμές" />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-brand-50 text-[11px] uppercase tracking-widest text-brand-900">
                    <tr>
                      <th className="px-4 py-3 text-left">Περιγραφή</th>
                      <th className="px-4 py-3 text-right">Ποσότητα</th>
                      <th className="px-4 py-3 text-right">Τιμή</th>
                      <th className="px-4 py-3 text-right">ΦΠΑ</th>
                      <th className="px-4 py-3 text-right">Σύνολο</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-300/60">
                    {doc.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-3 text-ink-900">
                          {l.description}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {l.quantity.toString()} {l.unit}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {money(l.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {l.vatRate.toString()}%
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-brand-900">
                          {money(l.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-ink-100 text-base">
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-right text-ink-700">
                        Καθαρή αξία
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {money(doc.netTotalAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-right text-ink-700">
                        ΦΠΑ
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {money(doc.vatTotalAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-right text-lg font-semibold text-ink-900"
                      >
                        Τελικό Σύνολο
                      </td>
                      <td className="px-4 py-3 text-right text-xl font-bold text-brand-900">
                        {money(doc.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardBody>
          </Card>

          {(doc.additionalTaxes || doc.notes) && (
            <Card>
              <CardHeader title="Επιπλέον" />
              <CardBody className="space-y-4">
                {doc.additionalTaxes && (
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      Επιπλέον φόροι
                    </p>
                    <p className="mt-1 whitespace-pre-line text-base text-ink-900">
                      {doc.additionalTaxes}
                    </p>
                  </div>
                )}
                {doc.notes && (
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      Σημειώσεις
                    </p>
                    <p className="mt-1 whitespace-pre-line text-base text-ink-900">
                      {doc.notes}
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Κατάσταση" />
            <CardBody className="space-y-3 text-base">
              <StatusRow
                label="Παραστατικό"
                value={
                  t.status[doc.status as keyof typeof t.status] ?? doc.status
                }
                tone={statusTone(doc.status)}
              />
              <StatusRow
                label="Πληρωμή"
                value={paymentLabel(doc.paymentStatus)}
                tone={paymentTone(doc.paymentStatus)}
              />
              <MetaRow
                label="Εγκατάσταση"
                value={doc.branch?.label ?? "Έδρα"}
              />
              <MetaRow label="Ημ. έκδοσης" value={date(doc.issueDate)} />
              {doc.deliveryNoteRef && (
                <MetaRow
                  label="Δελτίο διακίνησης"
                  value={doc.deliveryNoteRef}
                />
              )}
              {doc.paymentMethod && (
                <MetaRow
                  label="Μέθοδος πληρωμής"
                  value={doc.paymentMethod}
                />
              )}
              <MetaRow
                label="Γλώσσα εκτυπώσιμου"
                value={doc.printLanguage === "en" ? "Αγγλικά" : "Ελληνικά"}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="myDATA" />
            <CardBody className="space-y-3 text-sm">
              <Row label="MARK" value={doc.myDataMark} />
              <Row label="UID" value={doc.myDataUid} />
              <Row label="QR" value={doc.myDataQrUrl} link />
              <Row label="Επίσημη έκδοση" value={doc.wrappInvoiceUrl} link />
              {doc.lastWrappError && (
                <p className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
                  {doc.lastWrappError}
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function ClientField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-ink-900">{value}</p>
    </div>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "danger" | "neutral" | "muted" | "brand";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-700">{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-ink-700">{label}</span>
      <span className="text-right font-semibold text-ink-900">{value}</span>
    </div>
  );
}

function statusTone(status: string) {
  switch (status) {
    case "issued":
      return "success" as const;
    case "sending":
      return "brand" as const;
    case "failed":
      return "danger" as const;
    case "cancelled":
      return "muted" as const;
    default:
      return "neutral" as const;
  }
}

function paymentTone(status: string) {
  if (status === "paid") return "success" as const;
  if (status === "partial") return "warning" as const;
  return "muted" as const;
}

function paymentLabel(status: string) {
  if (status === "paid") return t.status.paid;
  if (status === "partial") return t.status.partial;
  return t.status.unpaid;
}

function Row({
  label,
  value,
  link,
}: {
  label: string;
  value: string | null;
  link?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-ink-700">{label}</span>
      {value ? (
        link ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="truncate font-semibold text-brand-800 hover:text-brand-900"
          >
            Άνοιγμα ↗
          </a>
        ) : (
          <span className="truncate font-mono text-xs text-ink-900">
            {value}
          </span>
        )
      ) : (
        <span className="text-ink-500">—</span>
      )}
    </div>
  );
}
