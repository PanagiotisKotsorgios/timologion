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
  Send,
  Eye,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { HelpTip } from "@/components/ui/HelpTip";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { t } from "@/lib/i18n";
import {
  createDraftAction,
  updateDraftAction,
  ensureBillingBookForTypeAction,
  attemptIssueAction,
  type DraftInput,
} from "./actions";
import { QuickAddClientButton } from "./QuickAddClientButton";
import { QuickAddItemButton } from "./QuickAddItemButton";
import {
  CorrelatedInvoicePicker,
  type IssuedDocOption,
} from "./CorrelatedInvoicePicker";

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
  { value: "eu_sale_invoice", label: "Τιμολόγιο πώλησης — ενδοκοινοτικό (1.2)" },
  {
    value: "third_country_sale_invoice",
    label: "Τιμολόγιο πώλησης — τρίτες χώρες (1.3)",
  },
  { value: "service_invoice", label: "Τιμολόγιο παροχής (2.1)" },
  { value: "eu_service_invoice", label: "Τιμολόγιο παροχής — ενδοκοινοτικό (2.2)" },
  {
    value: "third_country_service_invoice",
    label: "Τιμολόγιο παροχής — τρίτες χώρες (2.3)",
  },
  { value: "retail_receipt", label: "Απόδειξη λιανικής (11.1)" },
  { value: "service_receipt", label: "Απόδειξη παροχής υπηρεσιών (11.2)" },
  { value: "simplified_invoice", label: "Απλοποιημένο τιμολόγιο (11.3)" },
  { value: "credit_note", label: "Πιστωτικό μη συσχετιζόμενο (5.2)" },
  { value: "credit_note_correlated", label: "Πιστωτικό συσχετιζόμενο (5.1)" },
  { value: "delivery_note", label: "Δελτίο αποστολής (9.3)" },
  { value: "stay_tax_receipt", label: "Απόδειξη φόρου διαμονής (8.2)" },
  { value: "proforma", label: "Προτιμολόγιο" },
  { value: "quote", label: "Προσφορά" },
  { value: "order", label: "Παραγγελία" },
];

const FOREIGN_TYPES = new Set<DraftInput["type"]>([
  "eu_sale_invoice",
  "third_country_sale_invoice",
  "eu_service_invoice",
  "third_country_service_invoice",
]);
const CORRELATED_TYPES = new Set<DraftInput["type"]>([
  "credit_note_correlated",
  "stay_tax_receipt",
]);

const PAYMENT_METHODS = [
  "Μετρητά",
  "Χρεωστική / Πιστωτική κάρτα",
  "Τραπεζική μεταφορά",
  "IRIS",
  "Επιταγή",
  "Επί πιστώσει",
  "Άλλο",
];

// Greek legal limit for cash-settled B2B transactions. Payments in cash
// above this threshold are not deductible as expenses (Ν. 4172/2013 άρθρο
// 23 παρ. 4) and B2C limits kick in from the same threshold too. We warn
// but don't block issuance — the user may still have a legitimate reason.
const CASH_LIMIT_EUR = 500;

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

export type DraftEditorInitial = {
  id: string;
  type: DraftInput["type"];
  clientId: string;
  branchId: string;
  billingBookId: string;
  issueDate: string;
  deliveryNoteRef: string;
  paymentMethod: string;
  printLanguage: "el" | "en";
  additionalTaxes: string;
  notes: string;
  lines: Line[];
  dispatchAt?: string;
  dispatchReason?: string;
  dispatchPurpose?: string;
  destinationAddress?: string;
  vehicleNumber?: string;
  driverName?: string;
  correlatedDocumentId?: string;
  correlatedMarkOverride?: string;
  currency?: string;
  exchangeRate?: string;
  stayTaxCategory?: string;
  stayTaxAmount?: string;
};

export function DraftEditor({
  initialType,
  businessName,
  clients,
  items,
  branches,
  books,
  editing,
  defaultNotes = "",
  issuedDocsForCorrelation = [],
}: {
  initialType?: DraftInput["type"];
  businessName: string;
  clients: ClientOption[];
  items: ItemOption[];
  branches: BranchOption[];
  books: BookOption[];
  /** Present when editing an existing draft. All form state is pre-filled. */
  editing?: DraftEditorInitial;
  /** Business-wide default notes (bank info, terms) prepended to new drafts. */
  defaultNotes?: string;
  issuedDocsForCorrelation?: IssuedDocOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [type, setType] = useState<DraftInput["type"]>(
    editing?.type ?? initialType ?? "invoice",
  );
  // Local mirrors so the "Νέος πελάτης" / "Νέο είδος" quick-add modals
  // can push freshly created rows into the pickers without a route
  // refresh. Server-side sources still authoritative on next render.
  const [clientOptions, setClientOptions] = useState<ClientOption[]>(clients);
  const [itemOptions, setItemOptions] = useState<ItemOption[]>(items);
  const [clientId, setClientId] = useState(editing?.clientId ?? "");
  const [branchId, setBranchId] = useState(
    () => editing?.branchId || branches.find((b) => b.isDefault)?.id || "",
  );
  const [dynamicBooks, setDynamicBooks] = useState<BookOption[]>(books);
  const availableBooks = useMemo(
    () => dynamicBooks.filter((b) => b.documentType === type),
    [dynamicBooks, type],
  );
  const [billingBookId, setBillingBookId] = useState(
    () =>
      editing?.billingBookId ||
      availableBooks.find((b) => b.isDefault)?.id ||
      "",
  );
  useEffect(() => {
    if (!availableBooks.some((b) => b.id === billingBookId)) {
      setBillingBookId(availableBooks.find((b) => b.isDefault)?.id ?? "");
    }
  }, [availableBooks, billingBookId]);

  // If the user switches to a document type that has no billing book yet,
  // silently auto-create the default series so the "Σειρά" dropdown is
  // never empty on first use.
  useEffect(() => {
    if (availableBooks.length > 0) return;
    let cancelled = false;
    ensureBillingBookForTypeAction(type).then((res) => {
      if (cancelled || !res.ok) return;
      setDynamicBooks(res.books);
    });
    return () => {
      cancelled = true;
    };
  }, [type, availableBooks.length]);

  const [issueDate, setIssueDate] = useState(
    () => editing?.issueDate || new Date().toISOString().slice(0, 10),
  );
  const [deliveryNoteRef, setDeliveryNoteRef] = useState(
    editing?.deliveryNoteRef ?? "",
  );
  const [paymentMethod, setPaymentMethod] = useState(
    editing?.paymentMethod || "Μετρητά",
  );
  const [printLanguage, setPrintLanguage] = useState<"el" | "en">(
    editing?.printLanguage ?? "el",
  );
  const [additionalTaxes, setAdditionalTaxes] = useState(
    editing?.additionalTaxes ?? "",
  );
  const [notes, setNotes] = useState(editing?.notes ?? defaultNotes);
  const [lines, setLines] = useState<Line[]>(
    editing?.lines?.length ? editing.lines : [emptyLine(0)],
  );
  // ─── Delivery-note (9.3) dispatch fields ───────────────────────────
  const [dispatchAt, setDispatchAt] = useState(
    editing?.dispatchAt ?? "",
  );
  const [dispatchReason, setDispatchReason] = useState(
    editing?.dispatchReason ?? "Πώληση",
  );
  const [dispatchPurpose, setDispatchPurpose] = useState(
    editing?.dispatchPurpose ?? "Παράδοση",
  );
  const [destinationAddress, setDestinationAddress] = useState(
    editing?.destinationAddress ?? "",
  );
  const [vehicleNumber, setVehicleNumber] = useState(
    editing?.vehicleNumber ?? "",
  );
  const [driverName, setDriverName] = useState(editing?.driverName ?? "");
  // Correlated credit-note (5.1) reference — parent invoice picker.
  const [correlatedDocumentId, setCorrelatedDocumentId] = useState(
    editing?.correlatedDocumentId ?? "",
  );
  const [correlatedMarkOverride, setCorrelatedMarkOverride] = useState(
    editing?.correlatedMarkOverride ?? "",
  );
  // Foreign transactions (1.2 / 1.3 / 2.2 / 2.3): currency + exchange rate.
  const [currency, setCurrency] = useState(editing?.currency ?? "EUR");
  const [exchangeRate, setExchangeRate] = useState(editing?.exchangeRate ?? "1.0000");
  // Stay-tax (8.2): hotel category + amount.
  const [stayTaxCategory, setStayTaxCategory] = useState(
    editing?.stayTaxCategory ?? "",
  );
  const [stayTaxAmount, setStayTaxAmount] = useState(
    editing?.stayTaxAmount ?? "0.00",
  );
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Modal shown when the user tries to issue an invoice with cash payment
  // over the Greek €500 legal limit (Ν. 4172/2013 άρθρο 23 παρ. 4). Non-
  // blocking — user can proceed after acknowledging the risk.
  const [cashLimitModal, setCashLimitModal] = useState(false);

  const totals = useMemo(() => computeTotals(lines), [lines]);
  const cashLimitBreached =
    paymentMethod === "Μετρητά" && totals.total > CASH_LIMIT_EUR;
  const selectedClient = useMemo(
    () => clientOptions.find((c) => c.id === clientId) ?? null,
    [clientId, clientOptions],
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
    const found = itemOptions.find((i) => i.id === itemId);
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

  function submit(mode: "save" | "issue" = "save") {
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
      // Delivery-note extras — only meaningful for type=delivery_note; the
      // server nulls them on other types anyway.
      dispatchAt: type === "delivery_note" ? dispatchAt || undefined : undefined,
      dispatchReason:
        type === "delivery_note" ? dispatchReason || undefined : undefined,
      dispatchPurpose:
        type === "delivery_note" ? dispatchPurpose || undefined : undefined,
      destinationAddress:
        type === "delivery_note" ? destinationAddress || undefined : undefined,
      vehicleNumber:
        type === "delivery_note" ? vehicleNumber || undefined : undefined,
      driverName:
        type === "delivery_note" ? driverName || undefined : undefined,
      correlatedDocumentId: CORRELATED_TYPES.has(type)
        ? correlatedDocumentId || undefined
        : undefined,
      correlatedMarkOverride: CORRELATED_TYPES.has(type)
        ? correlatedMarkOverride || undefined
        : undefined,
      currency: FOREIGN_TYPES.has(type) ? currency || undefined : undefined,
      exchangeRate: FOREIGN_TYPES.has(type)
        ? Number(exchangeRate) || undefined
        : undefined,
      stayTaxCategory:
        type === "stay_tax_receipt"
          ? stayTaxCategory || undefined
          : undefined,
      stayTaxAmount:
        type === "stay_tax_receipt"
          ? Number(stayTaxAmount) || undefined
          : undefined,
    };

    startTransition(async () => {
      const saveRes = editing
        ? await updateDraftAction(editing.id, payload)
        : await createDraftAction(payload);
      if (!saveRes.ok) {
        setError(saveRes.error);
        toast.error(saveRes.error);
        return;
      }
      if (mode === "issue") {
        const issueRes = await attemptIssueAction(saveRes.id);
        if (!issueRes.ok) {
          setError(issueRes.error);
          toast.error(issueRes.error);
          router.push(`/app/documents/${saveRes.id}`);
          return;
        }
        toast.success("Το παραστατικό διαβιβάστηκε στο myDATA.");
      } else {
        toast.success(editing ? "Οι αλλαγές αποθηκεύτηκαν." : "Το πρόχειρο αποθηκεύτηκε.");
      }
      router.push(`/app/documents/${saveRes.id}`);
    });
  }

  /**
   * Wraps the issue action so we can intercept it when the payment is
   * cash and the total is over the Greek €500 legal limit. Shows a
   * confirmation modal instead of blocking — the user knows their
   * business and may still want to proceed.
   */
  function attemptIssue() {
    if (cashLimitBreached) {
      setCashLimitModal(true);
      return;
    }
    submit("issue");
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
            <Field
              label="Εγκατάσταση"
              htmlFor="branchId"
              help="Το φυσικό υποκατάστημα από όπου εκδίδεται το παραστατικό — π.χ. έδρα, αποθήκη, κατάστημα. Δηλώνεται στην ΑΑΔΕ."
            >
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
              <Field
                label="Τύπος παραστατικού"
                htmlFor="type"
                required
                help="Ο κωδικός myDATA καθορίζει τι δηλώνεται στην ΑΑΔΕ. Για πωλήσεις με ΑΦΜ → Τιμολόγιο. Για λιανική/ιδιώτες → Απόδειξη. Για ακύρωση παλιότερου → Πιστωτικό."
              >
                <Select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as DraftInput["type"])}
                  required
                >
                  {DOC_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Ημ. έκδοσης"
                htmlFor="issueDate"
                required
                help="Η ημερομηνία που εκδίδεται το παραστατικό. Συνήθως σήμερα. Δεν μπορεί να τροποποιηθεί μετά την οριστική έκδοση στην ΑΑΔΕ."
              >
                <Input
                  id="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                />
              </Field>

              <Field
                label="Σειρά"
                htmlFor="billingBookId"
                required
                help="Η σειρά αρίθμησης (π.χ. Α, Β) που θα ενημερώσει τη Wrapp / ΑΑΔΕ. Δημιουργείται αυτόματα αν δεν έχεις ορίσει καμία στα «Στοιχεία επιχείρησης»."
              >
                <Select
                  id="billingBookId"
                  value={billingBookId}
                  onChange={(e) => setBillingBookId(e.target.value)}
                  disabled={availableBooks.length === 0}
                  required
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
              <QuickAddClientButton
                onCreated={(c) => {
                  setClientOptions((prev) => [
                    ...prev,
                    {
                      id: c.id,
                      label: c.label,
                      vatNumber: c.vatNumber,
                      taxOffice: c.taxOffice,
                      addressLine: c.addressLine,
                      city: c.city,
                      postalCode: c.postalCode,
                      country: c.country,
                      activity: c.activity,
                      email: c.email,
                      phone: c.phone,
                    },
                  ]);
                  setClientId(c.id);
                  toast.success("Ο πελάτης προστέθηκε.");
                }}
              />
            }
          />
          <CardBody className="space-y-6">
            <Field
              label="Όνομα"
              htmlFor="clientId"
              help="Ο πελάτης για τον οποίο εκδίδεται το παραστατικό. Αν δεν υπάρχει, πάτησε «Νέος πελάτης» — μπορείς να συμπληρώσεις ΑΦΜ και τα υπόλοιπα στοιχεία τραβιούνται αυτόματα."
            >
              <Select
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">— Επιλέξτε πελάτη —</option>
                {clientOptions.map((c) => (
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

        {CORRELATED_TYPES.has(type) && (
          <CorrelatedInvoicePicker
            options={issuedDocsForCorrelation}
            correlatedDocumentId={correlatedDocumentId}
            onCorrelatedDocumentIdChange={setCorrelatedDocumentId}
            correlatedMarkOverride={correlatedMarkOverride}
            onCorrelatedMarkOverrideChange={setCorrelatedMarkOverride}
          />
        )}
        {FOREIGN_TYPES.has(type) && (
          <CurrencyExchangeCard
            currency={currency}
            onCurrencyChange={setCurrency}
            exchangeRate={exchangeRate}
            onExchangeRateChange={setExchangeRate}
          />
        )}
        {type === "stay_tax_receipt" && (
          <StayTaxCard
            category={stayTaxCategory}
            onCategoryChange={setStayTaxCategory}
            amount={stayTaxAmount}
            onAmountChange={setStayTaxAmount}
          />
        )}
        {type === "delivery_note" ? (
          <DispatchInfoCard
            dispatchAt={dispatchAt}
            setDispatchAt={setDispatchAt}
            dispatchReason={dispatchReason}
            setDispatchReason={setDispatchReason}
            dispatchPurpose={dispatchPurpose}
            setDispatchPurpose={setDispatchPurpose}
            destinationAddress={destinationAddress}
            setDestinationAddress={setDestinationAddress}
            vehicleNumber={vehicleNumber}
            setVehicleNumber={setVehicleNumber}
            driverName={driverName}
            setDriverName={setDriverName}
            printLanguage={printLanguage}
            setPrintLanguage={setPrintLanguage}
          />
        ) : (
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
              <Field
                label="Μέθοδος πληρωμής"
                htmlFor="paymentMethod"
                help="Πώς θα εξοφληθεί το παραστατικό. Προσοχή: στην Ελλάδα πληρωμές άνω των 500€ δεν επιτρέπονται με μετρητά — χρησιμοποίησε κάρτα ή τραπεζική μεταφορά."
              >
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
              {cashLimitBreached && (
                <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-black uppercase tracking-widest">
                    Προσοχή · Όριο μετρητών
                  </p>
                  <p className="mt-1">
                    Στην Ελλάδα οι συναλλαγές B2B σε μετρητά άνω των{" "}
                    <strong>{CASH_LIMIT_EUR}€</strong> δεν αναγνωρίζονται ως
                    εκπεστέες δαπάνες (Ν. 4172/2013 άρθρο 23 παρ. 4). Σκέψου
                    τραπεζική μεταφορά, POS ή IRIS.
                  </p>
                </div>
              )}
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
        )}

        <Card>
          <CardBody className="space-y-3">
            <Button
              type="button"
              onClick={attemptIssue}
              disabled={pending}
              size="lg"
              className="w-full"
              icon={Send}
            >
              {pending ? "Παρακαλώ περίμενε..." : "Έκδοση παραστατικού"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => submit("save")}
              disabled={pending}
              size="md"
              className="w-full"
              icon={Save}
            >
              Αποθήκευση ως πρόχειρο
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
              <table className="w-full min-w-[1120px] text-base">
                <thead className="bg-brand-100 text-[12px] uppercase tracking-widest text-brand-900">
                  <tr>
                    <th className="px-4 py-4 text-left" style={{ width: "220px" }}>
                      <span className="inline-flex items-center gap-1.5">
                        Είδος/Υπηρεσία
                        <HelpTip text="Επίλεξε ένα αποθηκευμένο είδος ή υπηρεσία. Αν δεν υπάρχει, πάτησε «Νέο» για να το προσθέσεις χωρίς να φύγεις από την οθόνη." />
                      </span>
                    </th>
                    <th className="px-4 py-4 text-left">
                      <span className="inline-flex items-center gap-1.5">
                        Περιγραφή
                        <span aria-hidden className="text-red-600">*</span>
                        <HelpTip text="Γράψε τι πουλάς — αυτό εμφανίζεται στο παραστατικό. Αν επέλεξες είδος, συμπληρώνεται αυτόματα και μπορείς να το επεξεργαστείς." />
                      </span>
                    </th>
                    <th className="px-4 py-4 text-right" style={{ width: "140px" }}>
                      <span className="inline-flex items-center gap-1.5">
                        Ποσότητα
                        <HelpTip text="Πόσα τεμάχια/μονάδες. Δέχεται δεκαδικά (π.χ. 1,5 ώρες)." />
                      </span>
                    </th>
                    <th className="px-4 py-4 text-right" style={{ width: "170px" }}>
                      <span className="inline-flex items-center gap-1.5">
                        Τιμή
                        <HelpTip text="Τιμή μονάδας ΧΩΡΙΣ ΦΠΑ σε ευρώ. Ο ΦΠΑ υπολογίζεται αυτόματα από τη στήλη ΦΠΑ %." />
                      </span>
                    </th>
                    <th className="px-4 py-4 text-right" style={{ width: "120px" }}>
                      <span className="inline-flex items-center gap-1.5">
                        Έκπτ. %
                        <HelpTip text="Ποσοστό έκπτωσης στη συγκεκριμένη γραμμή (0-100). Άφησέ το 0 αν δεν υπάρχει έκπτωση." />
                      </span>
                    </th>
                    <th className="px-4 py-4 text-right" style={{ width: "120px" }}>
                      <span className="inline-flex items-center gap-1.5">
                        ΦΠΑ %
                        <HelpTip text="Συντελεστής ΦΠΑ. Συνήθως 24 (κανονικός), 13 (μειωμένος), 6 (υπερμειωμένος) ή 0 (απαλλαγή/ενδοκοινοτικές)." />
                      </span>
                    </th>
                    <th className="px-4 py-4 text-right" style={{ width: "160px" }}>
                      <span className="inline-flex items-center gap-1.5 justify-end w-full">
                        Σύνολο
                        <HelpTip text="Αυτόματο σύνολο γραμμής (Ποσότητα × Τιμή − Έκπτωση + ΦΠΑ)." />
                      </span>
                    </th>
                    <th style={{ width: "44px" }} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-300/60">
                  {lines.map((l) => {
                    const tot = computeLineDisplay(l);
                    return (
                      <tr key={l.key}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={l.itemId}
                              onChange={(e) => pickItem(l.key, e.target.value)}
                              className="row-select"
                            >
                              <option value="">— Επιλογή —</option>
                              {itemOptions.map((it) => (
                                <option key={it.id} value={it.id}>
                                  {it.name}
                                </option>
                              ))}
                            </select>
                            <QuickAddItemButton
                              compact
                              label="Νέο"
                              onCreated={(it) => {
                                setItemOptions((prev) => [...prev, it]);
                                pickItem(l.key, it.id);
                                toast.success("Το είδος προστέθηκε.");
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            value={l.description}
                            onChange={(e) =>
                              updateLine(l.key, { description: e.target.value })
                            }
                            required
                            className="row-input"
                          />
                        </td>
                        <td className="px-3 py-2.5">
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
                        <td className="px-3 py-2.5">
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
                        <td className="px-3 py-2.5">
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
                        <td className="px-3 py-2.5">
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
                        <td className="px-4 py-2.5 text-right text-base font-bold text-brand-900 tabular-nums">
                          {formatMoney(tot.total)}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => removeLine(l.key)}
                            className="grid h-9 w-9 place-items-center rounded-md text-red-700 hover:bg-red-50 disabled:opacity-40"
                            disabled={lines.length === 1}
                            aria-label="Αφαίρεση γραμμής"
                          >
                            <Trash2 size={16} />
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
          variant="secondary"
          onClick={() => submit("save")}
          disabled={pending}
          size="lg"
          icon={Save}
        >
          Αποθήκευση ως πρόχειρο
        </Button>
        <Button
          type="button"
          onClick={attemptIssue}
          disabled={pending}
          size="lg"
          icon={Send}
        >
          {pending ? "Παρακαλώ περίμενε..." : "Έκδοση παραστατικού"}
        </Button>
      </div>

      {cashLimitModal && (
        <CashLimitModal
          total={totals.total}
          onCancel={() => setCashLimitModal(false)}
          onProceed={() => {
            setCashLimitModal(false);
            submit("issue");
          }}
        />
      )}
    </div>
  );
}

function CurrencyExchangeCard({
  currency,
  onCurrencyChange,
  exchangeRate,
  onExchangeRateChange,
}: {
  currency: string;
  onCurrencyChange: (v: string) => void;
  exchangeRate: string;
  onExchangeRateChange: (v: string) => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-blue-300 bg-blue-50/60 p-5">
      <p className="text-[11px] font-black uppercase tracking-widest text-blue-900/80">
        Νόμισμα & ισοτιμία (απαιτείται για EU / τρίτες χώρες)
      </p>
      <p className="mt-1 text-sm text-blue-900/80">
        Για ενδοκοινοτικές πωλήσεις/παροχές και για τρίτες χώρες, το
        myDATA απαιτεί κωδικό νομίσματος (ISO 4217) και ισοτιμία προς
        EUR στην ημερομηνία έκδοσης.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field
          label="Νόμισμα (ISO)"
          htmlFor="currency"
          help="Ο τριγράμματος κωδικός νομίσματος (π.χ. USD, GBP, CHF) όταν εκδίδεις σε ξένο νόμισμα. Για ευρώ άφησέ το κενό."
        >
          <Input
            id="currency"
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value.toUpperCase())}
            maxLength={3}
            placeholder="EUR"
            className="mono uppercase"
          />
        </Field>
        <Field
          label="Ισοτιμία προς EUR"
          htmlFor="exchangeRate"
          hint="π.χ. 1.0862 για 1 USD → EUR"
          help="Πόσα ευρώ αντιστοιχούν σε 1 μονάδα ξένου νομίσματος την ημέρα έκδοσης. Χρησιμοποίησε την ισοτιμία της ΕΚΤ (Ευρωπαϊκής Κεντρικής Τράπεζας)."
        >
          <Input
            id="exchangeRate"
            type="number"
            step="0.0001"
            min="0"
            value={exchangeRate}
            onChange={(e) => onExchangeRateChange(e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

function StayTaxCard({
  category,
  onCategoryChange,
  amount,
  onAmountChange,
}: {
  category: string;
  onCategoryChange: (v: string) => void;
  amount: string;
  onAmountChange: (v: string) => void;
}) {
  // Greek stay-tax categories (Ν. 4389/2016 άρθρο 53) — updated 2024 tiers.
  const CATEGORIES = [
    { value: "hotel_5", label: "Ξενοδοχείο 5 αστέρων (10€)" },
    { value: "hotel_4", label: "Ξενοδοχείο 4 αστέρων (7€)" },
    { value: "hotel_3", label: "Ξενοδοχείο 3 αστέρων (3€)" },
    { value: "hotel_1_2", label: "Ξενοδοχείο 1-2 αστέρων (1.5€)" },
    { value: "furnished_rooms", label: "Επιπλωμένα δωμάτια/διαμερίσματα (0.5€)" },
    { value: "other", label: "Άλλο (Airbnb, κάμπινγκ, κ.λπ.)" },
  ];
  return (
    <div className="rounded-2xl border-2 border-purple-300 bg-purple-50/60 p-5">
      <p className="text-[11px] font-black uppercase tracking-widest text-purple-900/80">
        Πληροφορίες φόρου διαμονής (απαιτείται για 8.2)
      </p>
      <p className="mt-1 text-sm text-purple-900/80">
        Επίλεξε την κατηγορία καταλύματος και συμπλήρωσε το συνολικό ποσό
        του φόρου διαμονής που εισπράχθηκε.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field
          label="Κατηγορία καταλύματος"
          htmlFor="stayTaxCategory"
          help="Καθορίζει το ποσό του φόρου διαμονής ανά διανυκτέρευση σύμφωνα με τον Ν. 4389/2016 (10€/7€/3€/1.5€/0.5€)."
        >
          <Select
            id="stayTaxCategory"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            <option value="">— Επιλέξτε —</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Συνολικό ποσό φόρου (€)"
          htmlFor="stayTaxAmount"
          help="Ποσό φόρου διαμονής × αριθμός διανυκτερεύσεων. Π.χ. για ξενοδοχείο 4 αστέρων 3 βράδια: 7 × 3 = 21€."
        >
          <Input
            id="stayTaxAmount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

function CashLimitModal({
  total,
  onCancel,
  onProceed,
}: {
  total: number;
  onCancel: () => void;
  onProceed: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cash-limit-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Ακύρωση"
        onClick={onCancel}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-lg rounded-3xl border-2 border-amber-400 bg-white p-8 shadow-2xl">
        <div className="flex items-start gap-3">
          <div
            aria-hidden
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700"
          >
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
              <path
                d="M12 3l10 18H2L12 3zm0 6v5m0 3v.5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h2
              id="cash-limit-title"
              className="text-2xl font-extrabold text-brand-900 md:text-3xl"
            >
              Πληρωμή σε μετρητά άνω των {CASH_LIMIT_EUR}€
            </h2>
            <p className="mt-2 text-sm text-ink-700">
              Το τελικό σύνολο είναι{" "}
              <strong>{formatMoney(total)}</strong>. Στην Ελλάδα, οι
              συναλλαγές B2B σε μετρητά άνω των{" "}
              <strong>{CASH_LIMIT_EUR}€</strong> δεν αναγνωρίζονται ως
              εκπεστέες δαπάνες (Ν. 4172/2013 άρθρο 23 παρ. 4). Παρόμοιοι
              περιορισμοί ισχύουν και για B2C λιανικές συναλλαγές.
            </p>
            <p className="mt-3 text-sm text-ink-700">
              Προτείνουμε τραπεζική μεταφορά, POS ή IRIS.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center rounded-full border-2 border-ink-300 bg-white px-5 text-sm font-bold text-ink-900 hover:border-brand-900"
          >
            Αλλαγή μεθόδου πληρωμής
          </button>
          <button
            type="button"
            onClick={onProceed}
            className="inline-flex h-11 items-center rounded-full bg-amber-600 px-5 text-sm font-bold text-white hover:bg-amber-700"
          >
            Έκδοση παρόλα αυτά
          </button>
        </div>
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

// ─── Delivery-note dispatch info card ─────────────────────────────────────

const DISPATCH_REASONS = [
  "Πώληση",
  "Δείγματα",
  "Επιστροφή",
  "Μεταφορά αποθηκευτικού χώρου",
  "Επισκευή",
  "Άλλο",
];

const DISPATCH_PURPOSES = [
  "Παράδοση",
  "Παραλαβή",
  "Ενδοδιακίνηση",
  "Άλλο",
];

function DispatchInfoCard({
  dispatchAt,
  setDispatchAt,
  dispatchReason,
  setDispatchReason,
  dispatchPurpose,
  setDispatchPurpose,
  destinationAddress,
  setDestinationAddress,
  vehicleNumber,
  setVehicleNumber,
  driverName,
  setDriverName,
  printLanguage,
  setPrintLanguage,
}: {
  dispatchAt: string;
  setDispatchAt: (v: string) => void;
  dispatchReason: string;
  setDispatchReason: (v: string) => void;
  dispatchPurpose: string;
  setDispatchPurpose: (v: string) => void;
  destinationAddress: string;
  setDestinationAddress: (v: string) => void;
  vehicleNumber: string;
  setVehicleNumber: (v: string) => void;
  driverName: string;
  setDriverName: (v: string) => void;
  printLanguage: "el" | "en";
  setPrintLanguage: (v: "el" | "en") => void;
}) {
  return (
    <Card>
      <CardHeader
        title="Στοιχεία διακίνησης"
        subtitle="Απαιτούμενα από τη myDATA για Δελτίο Αποστολής (9.3)."
      />
      <CardBody className="space-y-4">
        <Field
          label="Ημ/νία & ώρα αποστολής"
          htmlFor="dispatchAt"
          help="Πότε αναχωρούν τα αγαθά από την επιχείρησή σου. Υποχρεωτικό στα Δελτία Αποστολής (9.3)."
        >
          <Input
            id="dispatchAt"
            type="datetime-local"
            value={dispatchAt}
            onChange={(e) => setDispatchAt(e.target.value)}
          />
        </Field>

        <Field
          label="Σκοπός διακίνησης"
          htmlFor="dispatchReason"
          help="Γιατί μεταφέρονται τα αγαθά — π.χ. Πώληση, Δωρεά, Επιστροφή, Δείγμα."
        >
          <Select
            id="dispatchReason"
            value={dispatchReason}
            onChange={(e) => setDispatchReason(e.target.value)}
          >
            {DISPATCH_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Λόγος διακίνησης"
          htmlFor="dispatchPurpose"
          help="Επίσημος λόγος διακίνησης βάσει ΚΦΑΣ (π.χ. Πώληση, Παρακαταθήκη, Δωρεάν διάθεση)."
        >
          <Select
            id="dispatchPurpose"
            value={dispatchPurpose}
            onChange={(e) => setDispatchPurpose(e.target.value)}
          >
            {DISPATCH_PURPOSES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Διεύθυνση προορισμού"
          htmlFor="destinationAddress"
          help="Πού μεταφέρονται τα αγαθά. Συνήθως η διεύθυνση του παραλήπτη ή η αποθήκη προορισμού."
        >
          <Input
            id="destinationAddress"
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            placeholder="Οδός, αριθμός"
            maxLength={400}
          />
        </Field>

        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label="Αρ. οχήματος"
            htmlFor="vehicleNumber"
            help="Πινακίδα κυκλοφορίας του οχήματος μεταφοράς."
          >
            <Input
              id="vehicleNumber"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              placeholder="ABC-1234"
              maxLength={40}
              className="mono uppercase"
            />
          </Field>
          <Field
            label="Οδηγός / μεταφορέας"
            htmlFor="driverName"
            help="Όνομα οδηγού ή επωνυμία εταιρίας μεταφοράς."
          >
            <Input
              id="driverName"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Όνομα οδηγού"
              maxLength={160}
            />
          </Field>
        </div>

        <Field label="Γλώσσα εκτυπώσιμου" htmlFor="printLanguage">
          <Select
            id="printLanguage"
            value={printLanguage}
            onChange={(e) => setPrintLanguage(e.target.value as "el" | "en")}
          >
            <option value="el">Ελληνικά</option>
            <option value="en">Αγγλικά</option>
          </Select>
        </Field>
      </CardBody>
    </Card>
  );
}
