"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Save,
  Eye,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { t } from "@/lib/i18n";
import { createDraftAction, type DraftInput } from "./actions";

type ClientOption = {
  id: string;
  label: string;
  vatNumber: string | null;
  taxOffice: string | null;
  addressLine: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  activity: string | null;
  email: string | null;
  phone: string | null;
};
type ItemOption = {
  id: string;
  name: string;
  unit: string;
  defaultPrice: string;
  vatRate: string;
};
type BranchOption = { id: string; label: string; isDefault: boolean };
type BookOption = {
  id: string;
  series: string;
  label: string | null;
  documentType: DraftInput["type"];
  branchId: string | null;
  isDefault: boolean;
  nextNumber: number;
};

type Line = {
  key: number;
  itemId: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  discountPct: string;
  vatRate: string;
};

const DOC_TYPE_OPTIONS: { value: DraftInput["type"]; label: string }[] = [
  { value: "invoice", label: "Τιμολόγιο πώλησης (1.1)" },
  { value: "service_invoice", label: "Τιμολόγιο παροχής (2.1)" },
  { value: "retail_receipt", label: "Απόδειξη λιανικής (11.1)" },
  { value: "service_receipt", label: "Απόδειξη παροχής υπηρεσιών (11.4)" },
  { value: "credit_note", label: "Πιστωτικό (5.1)" },
  { value: "proforma", label: "Προτιμολόγιο" },
  { value: "quote", label: "Προσφορά" },
  { value: "order", label: "Παραγγελία" },
  { value: "delivery_note", label: "Δελτίο αποστολής" },
];

const PAYMENT_METHODS = [
  "Μετρητά",
  "Χρεωστική / Πιστωτική κάρτα",
  "Τραπεζική μεταφορά",
  "IRIS",
  "Επιταγή",
  "Επί πιστώσει",
  "Άλλο",
];

function emptyLine(key: number): Line {
  return {
    key,
    itemId: "",
    description: "",
    quantity: "1",
    unit: "τμχ",
    unitPrice: "0.00",
    discountPct: "0",
    vatRate: "24",
  };
}

export function DraftEditor({
  initialType,
  businessName,
  clients,
  items,
  branches,
  books,
}: {
  initialType?: DraftInput["type"];
  businessName: string;
  clients: ClientOption[];
  items: ItemOption[];
  branches: BranchOption[];
  books: BookOption[];
}) {
  const router = useRouter();
  const [type, setType] = useState<DraftInput["type"]>(initialType ?? "invoice");
  const [clientId, setClientId] = useState("");
  const [branchId, setBranchId] = useState(
    () => branches.find((b) => b.isDefault)?.id ?? "",
  );
  const availableBooks = useMemo(
    () => books.filter((b) => b.documentType === type),
    [books, type],
  );
  const [billingBookId, setBillingBookId] = useState(
    () => availableBooks.find((b) => b.isDefault)?.id ?? "",
  );
  useEffect(() => {
    if (!availableBooks.some((b) => b.id === billingBookId)) {
      setBillingBookId(availableBooks.find((b) => b.isDefault)?.id ?? "");
    }
  }, [availableBooks, billingBookId]);

  const [issueDate, setIssueDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [deliveryNoteRef, setDeliveryNoteRef] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Μετρητά");
  const [printLanguage, setPrintLanguage] = useState<"el" | "en">("el");
  const [additionalTaxes, setAdditionalTaxes] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine(0)]);
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totals = useMemo(() => computeTotals(lines), [lines]);
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId) ?? null,
    [clientId, clients],
  );
  const selectedBook = useMemo(
    () => availableBooks.find((b) => b.id === billingBookId) ?? null,
    [availableBooks, billingBookId],
  );

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((rows) =>
      rows.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }

  function pickItem(key: number, itemId: string) {
    const found = items.find((i) => i.id === itemId);
    if (!found) {
      updateLine(key, { itemId: "" });
      return;
    }
    updateLine(key, {
      itemId,
      description: found.name,
      unit: found.unit,
      unitPrice: found.defaultPrice,
      vatRate: found.vatRate,
    });
  }

  function addLine() {
    setLines((rows) => [...rows, emptyLine(rows[rows.length - 1]!.key + 1)]);
  }

  function removeLine(key: number) {
    setLines((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows));
  }

  function submit() {
    setError(null);
    const payload: DraftInput = {
      type,
      clientId: clientId || undefined,
      branchId: branchId || undefined,
      billingBookId: billingBookId || undefined,
      issueDate,
      deliveryNoteRef: deliveryNoteRef || undefined,
      paymentMethod: paymentMethod || undefined,
      printLanguage,
      additionalTaxes: additionalTaxes || undefined,
      notes: notes || undefined,
      lines: lines.map((l) => ({
        itemId: l.itemId || undefined,
        description: l.description,
        quantity: Number(l.quantity),
        unit: l.unit,
        unitPrice: Number(l.unitPrice),
        discountPct: Number(l.discountPct),
        vatRate: Number(l.vatRate),
      })),
    };

    startTransition(async () => {
      const res = await createDraftAction(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/app/documents/${res.id}`);
    });
  }

  return (
    <div className="space-y-6">
      {error && <Alert tone="danger">{error}</Alert>}

      {/* Top row: Στοιχεία + Πελάτης on the left, sidebar on the right */}
      <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">

        {/* ─── Στοιχεία παραστατικού ─── */}
        <Card>
          <CardHeader title="Στοιχεία παραστατικού" />
          <CardBody className="space-y-6">
            <Field label="Εγκατάσταση" htmlFor="branchId">
              {branches.length > 0 ? (
                <Select
                  id="branchId"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                >
                  <option value="">Έδρα · {businessName}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <div className="flex h-12 items-center rounded-lg border-2 border-ink-300 bg-ink-100 px-4 text-base font-semibold text-ink-900">
                  {businessName}
                </div>
              )}
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Τύπος παραστατικού" htmlFor="type">
                <Select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as DraftInput["type"])}
                >
                  {DOC_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Ημ. έκδοσης" htmlFor="issueDate">
                <Input
                  id="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </Field>

              <Field label="Σειρά" htmlFor="billingBookId">
                <Select
                  id="billingBookId"
                  value={billingBookId}
                  onChange={(e) => setBillingBookId(e.target.value)}
                  disabled={availableBooks.length === 0}
                >
                  {availableBooks.length === 0 && (
                    <option value="">— Χωρίς σειρά —</option>
                  )}
                  {availableBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.series}
                      {b.label ? ` — ${b.label}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Αρίθμηση" htmlFor="nextNumber">
                <div className="flex h-12 items-center rounded-lg border-2 border-ink-300 bg-ink-100 px-4 text-base font-semibold text-ink-900">
                  #{selectedBook?.nextNumber ?? "—"}
                </div>
              </Field>

              <Field
                label="Δελτίο διακίνησης"
                htmlFor="deliveryNoteRef"
                className="md:col-span-2"
                hint="Προαιρετική αναφορά σε δελτίο αποστολής."
              >
                <Input
                  id="deliveryNoteRef"
                  value={deliveryNoteRef}
                  onChange={(e) => setDeliveryNoteRef(e.target.value)}
                  placeholder="π.χ. ΔΑ-2026/00042"
                  maxLength={120}
                />
              </Field>
            </div>
          </CardBody>
        </Card>

        {/* ─── Πελάτης ─── */}
        <Card>
          <CardHeader
            title="Πελάτης"
            action={
              <Link
                href="/app/clients/new"
                className="text-sm font-semibold text-brand-800 hover:text-brand-900"
              >
                + Νέος πελάτης
              </Link>
            }
          />
          <CardBody className="space-y-6">
            <Field label="Όνομα" htmlFor="clientId">
              <Select
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">— Επιλέξτε πελάτη —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid gap-4 md:grid-cols-3">
              <ReadOnly label="ΑΦΜ" value={selectedClient?.vatNumber ?? "—"} />
              <ReadOnly
                label="Χώρα"
                value={
                  selectedClient?.country === "EN"
                    ? "Ηνωμ. Βασίλειο"
                    : "Ελλάδα"
                }
              />
              <ReadOnly label="Πόλη" value={selectedClient?.city ?? "—"} />
              <ReadOnly
                label="Διεύθυνση / Αριθμός"
                value={selectedClient?.addressLine ?? "—"}
                className="md:col-span-2"
              />
              <ReadOnly label="Τ.Κ." value={selectedClient?.postalCode ?? "—"} />
              <ReadOnly label="ΔΟΥ" value={selectedClient?.taxOffice ?? "—"} />
              <ReadOnly
                label="Αντικείμενο δραστηριότητας"
                value={selectedClient?.activity ?? "—"}
                className="md:col-span-2"
              />
            </div>

            {selectedClient && (
              <Link
                href={`/app/clients/${selectedClient.id}?edit=1`}
                className="inline-flex text-xs font-semibold text-brand-800 hover:text-brand-900"
              >
                Επεξεργασία στοιχείων πελάτη →
              </Link>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Sidebar column (Σύνολα + Πληρωμή + Actions) */}
      <aside className="space-y-6">
        <Card>
          <CardHeader title="Σύνολα" />
          <CardBody className="space-y-3">
            <TotalRow label="Σύνολο χωρίς ΦΠΑ" value={formatMoney(totals.net)} />
            <TotalRow label="Φ.Π.Α." value={formatMoney(totals.vat)} />
            <TotalRow label="Σύνολο με ΦΠΑ" value={formatMoney(totals.total)} />
            <div className="my-2 border-t-2 border-ink-300/60" />
            <TotalRow
              label="Τελικό Σύνολο"
              value={formatMoney(totals.total)}
              strong
            />
            <TotalRow
              label="Πληρωτέο ποσό"
              value={formatMoney(totals.total)}
              tone="brand"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Πληρωμή" />
          <CardBody className="space-y-4">
            <Field label="Επαφές πελάτη" htmlFor="contact">
              <Select id="contact" disabled defaultValue="">
                <option value="">
                  {selectedClient?.email ?? "— Επιλέξτε —"}
                </option>
              </Select>
            </Field>
            <Field label="Μέθοδος πληρωμής" htmlFor="paymentMethod">
              <Select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Γλώσσα εκτυπώσιμου" htmlFor="printLanguage">
              <Select
                id="printLanguage"
                value={printLanguage}
                onChange={(e) =>
                  setPrintLanguage(e.target.value as "el" | "en")
                }
              >
                <option value="el">Ελληνικά</option>
                <option value="en">Αγγλικά</option>
              </Select>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <Button
              type="button"
              onClick={submit}
              disabled={pending}
              size="lg"
              className="w-full"
              icon={Save}
            >
              {pending ? "Αποθήκευση..." : "Αποθήκευση ως πρόχειρο"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full"
              icon={Eye}
              disabled
              title="Θα ενεργοποιηθεί μετά την αποθήκευση"
            >
              Επισκόπηση
            </Button>
            <p className="text-xs text-ink-700">{t.brand.providerNote}</p>
          </CardBody>
        </Card>
      </aside>
      </div>

      {/* ─── Γραμμές (full width) ─── */}
      <div>
        <Card>
          <CardHeader
            title="Γραμμές"
            action={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addLine}
                icon={Plus}
              >
                Προσθήκη γραμμής
              </Button>
            }
          />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-brand-50 text-[11px] uppercase tracking-widest text-brand-900">
                  <tr>
                    <th className="px-3 py-3 text-left">Είδος/Υπηρεσία</th>
                    <th className="px-3 py-3 text-left">Περιγραφή</th>
                    <th className="px-3 py-3 text-right">Ποσότητα</th>
                    <th className="px-3 py-3 text-right">Τιμή</th>
                    <th className="px-3 py-3 text-right">Έκπτ. %</th>
                    <th className="px-3 py-3 text-right">ΦΠΑ %</th>
                    <th className="px-3 py-3 text-right">Σύνολο</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-300/60">
                  {lines.map((l) => {
                    const tot = computeLineDisplay(l);
                    return (
                      <tr key={l.key}>
                        <td className="px-2 py-1.5" style={{ width: "18%" }}>
                          <select
                            value={l.itemId}
                            onChange={(e) => pickItem(l.key, e.target.value)}
                            className="row-select"
                          >
                            <option value="">— Επιλογή —</option>
                            {items.map((it) => (
                              <option key={it.id} value={it.id}>
                                {it.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={l.description}
                            onChange={(e) =>
                              updateLine(l.key, { description: e.target.value })
                            }
                            required
                            className="row-input"
                          />
                        </td>
                        <td className="px-2 py-1.5" style={{ width: "82px" }}>
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={l.quantity}
                            onChange={(e) =>
                              updateLine(l.key, { quantity: e.target.value })
                            }
                            className="row-input text-right"
                          />
                        </td>
                        <td className="px-2 py-1.5" style={{ width: "92px" }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={l.unitPrice}
                            onChange={(e) =>
                              updateLine(l.key, { unitPrice: e.target.value })
                            }
                            className="row-input text-right"
                          />
                        </td>
                        <td className="px-2 py-1.5" style={{ width: "74px" }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={l.discountPct}
                            onChange={(e) =>
                              updateLine(l.key, { discountPct: e.target.value })
                            }
                            className="row-input text-right"
                          />
                        </td>
                        <td className="px-2 py-1.5" style={{ width: "72px" }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={l.vatRate}
                            onChange={(e) =>
                              updateLine(l.key, { vatRate: e.target.value })
                            }
                            className="row-input text-right"
                          />
                        </td>
                        <td
                          className="px-2 py-1.5 text-right text-sm font-semibold text-brand-900 tabular-nums"
                          style={{ width: "110px" }}
                        >
                          {formatMoney(tot.total)}
                        </td>
                        <td className="px-1 py-1.5 text-right" style={{ width: "36px" }}>
                          <button
                            type="button"
                            onClick={() => removeLine(l.key)}
                            className="grid h-8 w-8 place-items-center rounded-md text-red-700 hover:bg-red-50 disabled:opacity-40"
                            disabled={lines.length === 1}
                            aria-label="Αφαίρεση γραμμής"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* ─── Περισσότερα (collapsible) ─── */}
        <Card>
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <span className="text-base font-semibold text-ink-900">
              Περισσότερα
            </span>
            <span className="flex items-center gap-2 text-sm font-semibold text-brand-800">
              {showMore ? "Απόκρυψη" : "Εμφάνιση"}
              {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>
          {showMore && (
            <div className="space-y-6 border-t-2 border-ink-300/60 px-5 py-5">
              <Field
                label="Επιπλέον φόροι"
                hint="Παρακράτηση, χαρτόσημο, ΟΓΑ κ.ά. — μία ανά γραμμή."
                htmlFor="additionalTaxes"
              >
                <Textarea
                  id="additionalTaxes"
                  value={additionalTaxes}
                  onChange={(e) => setAdditionalTaxes(e.target.value)}
                  rows={3}
                  placeholder="π.χ. Παρακράτηση φόρου 20% : -100,00"
                />
              </Field>
              <Field label="Σημειώσεις" htmlFor="notes">
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Προαιρετικά σχόλια που εμφανίζονται στο παραστατικό."
                />
              </Field>
            </div>
          )}
        </Card>
      </div>

      {/* Bottom action bar mirroring the sidebar submit */}
      <div className="flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          onClick={submit}
          disabled={pending}
          size="lg"
          icon={Save}
        >
          {pending ? "Αποθήκευση..." : "Αποθήκευση ως πρόχειρο"}
        </Button>
      </div>
    </div>
  );
}

function ReadOnly({
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
      <p className="text-sm font-semibold text-ink-900">{label}</p>
      <p className="mt-1.5 truncate rounded-lg border-2 border-ink-300 bg-ink-100 px-4 py-3 text-base text-ink-900">
        {value}
      </p>
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "brand";
}) {
  return (
    <div className="flex items-center justify-between text-base">
      <span
        className={
          "text-ink-700 " + (strong ? "font-semibold text-ink-900" : "")
        }
      >
        {label}
      </span>
      <span
        className={
          "font-bold " +
          (tone === "brand"
            ? "text-xl text-brand-900"
            : strong
              ? "text-lg text-brand-900"
              : "text-ink-900")
        }
      >
        {value}
      </span>
    </div>
  );
}

function computeLineDisplay(l: Line) {
  const qty = Number(l.quantity) || 0;
  const price = Number(l.unitPrice) || 0;
  const discountPct = Number(l.discountPct) || 0;
  const vatRate = Number(l.vatRate) || 0;
  const gross = qty * price;
  const net = gross - (gross * discountPct) / 100;
  const vat = (net * vatRate) / 100;
  return { net, vat, total: net + vat };
}

function computeTotals(lines: Line[]) {
  return lines.reduce(
    (acc, l) => {
      const tot = computeLineDisplay(l);
      return {
        net: acc.net + tot.net,
        vat: acc.vat + tot.vat,
        total: acc.total + tot.total,
      };
    },
    { net: 0, vat: 0, total: 0 },
  );
}

function formatMoney(v: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(v);
}
