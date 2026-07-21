"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea, Field } from "@/components/ui/Input";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { saveRecurringAction } from "./actions";

type ClientOpt = { id: string; legalName: string };
type BookOpt = { id: string; label: string; series: string | null };
type BranchOpt = { id: string; name: string };
type ItemOpt = {
  id: string;
  name: string;
  defaultPrice: string;
  vatRate: number;
  unit: string;
};

type LineDraft = {
  itemId?: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vatRate: string;
  discountPct: string;
};

export type RecurringInitial = {
  id?: string;
  clientId?: string;
  billingBookId?: string | null;
  branchId?: string | null;
  type?: string;
  label?: string;
  cadence?: string;
  nextRunAt?: string;
  paymentMethod?: string | null;
  notes?: string | null;
  status?: string;
  lines?: LineDraft[];
};

const TYPE_OPTS = [
  { value: "invoice", label: "Τιμολόγιο πώλησης" },
  { value: "service_invoice", label: "Τιμολόγιο παροχής υπηρεσιών" },
  { value: "retail_receipt", label: "Απόδειξη λιανικής" },
  { value: "service_receipt", label: "Απόδειξη παροχής υπηρεσιών" },
  { value: "credit_note", label: "Πιστωτικό" },
  { value: "proforma", label: "Προτιμολόγιο" },
  { value: "quote", label: "Προσφορά" },
  { value: "order", label: "Παραγγελία" },
  { value: "delivery_note", label: "Δελτίο αποστολής" },
];

const CADENCE_OPTS = [
  { value: "weekly", label: "Εβδομαδιαία" },
  { value: "monthly", label: "Μηνιαία" },
  { value: "quarterly", label: "Τριμηνιαία" },
  { value: "yearly", label: "Ετήσια" },
];

const METHOD_OPTS = [
  { value: "", label: "—" },
  { value: "cash", label: "Μετρητά" },
  { value: "card", label: "Κάρτα" },
  { value: "bank_transfer", label: "Τραπεζική" },
  { value: "iris", label: "IRIS" },
  { value: "credit", label: "Επί πιστώσει" },
];

function emptyLine(): LineDraft {
  return {
    description: "",
    quantity: "1",
    unit: "τεμ.",
    unitPrice: "0",
    vatRate: "24",
    discountPct: "0",
  };
}

export function RecurringForm({
  initial,
  clients,
  books,
  branches,
  items,
}: {
  initial?: RecurringInitial;
  clients: ClientOpt[];
  books: BookOpt[];
  branches: BranchOpt[];
  items: ItemOpt[];
}) {
  const router = useRouter();

  const [lines, setLines] = useState<LineDraft[]>(
    initial?.lines?.length ? initial.lines : [emptyLine()],
  );

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, form: FormData) => {
      const payload = {
        id: initial?.id,
        clientId: String(form.get("clientId") ?? ""),
        billingBookId: (form.get("billingBookId") as string) || "",
        branchId: (form.get("branchId") as string) || "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: String(form.get("type") ?? "invoice") as any,
        label: String(form.get("label") ?? ""),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cadence: String(form.get("cadence") ?? "monthly") as any,
        nextRunAt: String(form.get("nextRunAt") ?? ""),
        paymentMethod: (form.get("paymentMethod") as string) || "",
        notes: (form.get("notes") as string) || "",
        status: (initial?.status === "paused" ? "paused" : "active") as
          | "active"
          | "paused",
        lines: lines.map((l) => ({
          itemId: l.itemId || undefined,
          description: l.description,
          quantity: Number(l.quantity || 0),
          unit: l.unit,
          unitPrice: Number(l.unitPrice || 0),
          vatRate: Number(l.vatRate || 0),
          discountPct: Number(l.discountPct || 0),
        })),
      };
      const res = await saveRecurringAction(payload);
      if (res.ok) {
        router.push("/app/documents/repeating");
        router.refresh();
        return null;
      }
      return { error: res.error ?? "Αποτυχία αποθήκευσης." };
    },
    null,
  );

  function updateLine(i: number, patch: Partial<LineDraft>) {
    setLines((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  }

  function selectItem(i: number, itemId: string) {
    const item = items.find((x) => x.id === itemId);
    if (!item) {
      updateLine(i, { itemId: undefined });
      return;
    }
    updateLine(i, {
      itemId: item.id,
      description: item.name,
      unit: item.unit,
      unitPrice: String(item.defaultPrice),
      vatRate: String(item.vatRate),
    });
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800">
          {state.error}
        </div>
      )}

      <Card>
        <CardHeader
          title="Βασικά στοιχεία"
          subtitle="Πελάτης, τύπος παραστατικού και συχνότητα."
        />
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label="Ετικέτα προτύπου" htmlFor="label">
            <Input
              id="label"
              name="label"
              required
              defaultValue={initial?.label}
              placeholder="π.χ. Μηνιαία συνδρομή hosting"
            />
          </Field>
          <Field label="Πελάτης" htmlFor="clientId">
            <Select
              id="clientId"
              name="clientId"
              required
              defaultValue={initial?.clientId ?? ""}
            >
              <option value="">— Επιλογή —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.legalName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Τύπος παραστατικού" htmlFor="type">
            <Select
              id="type"
              name="type"
              defaultValue={initial?.type ?? "invoice"}
            >
              {TYPE_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Σειρά" htmlFor="billingBookId">
            <Select
              id="billingBookId"
              name="billingBookId"
              defaultValue={initial?.billingBookId ?? ""}
            >
              <option value="">— Προεπιλογή —</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.series ? `${b.series} · ${b.label}` : b.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Υποκατάστημα" htmlFor="branchId">
            <Select
              id="branchId"
              name="branchId"
              defaultValue={initial?.branchId ?? ""}
            >
              <option value="">— Έδρα —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Συχνότητα" htmlFor="cadence">
            <Select
              id="cadence"
              name="cadence"
              defaultValue={initial?.cadence ?? "monthly"}
            >
              {CADENCE_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Επόμενη έκδοση" htmlFor="nextRunAt">
            <Input
              id="nextRunAt"
              name="nextRunAt"
              type="date"
              required
              defaultValue={initial?.nextRunAt ?? todayIso}
            />
          </Field>
          <Field label="Τρόπος πληρωμής" htmlFor="paymentMethod">
            <Select
              id="paymentMethod"
              name="paymentMethod"
              defaultValue={initial?.paymentMethod ?? ""}
            >
              {METHOD_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Σημειώσεις" htmlFor="notes" className="md:col-span-2">
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={initial?.notes ?? ""}
              placeholder="Προαιρετικές οδηγίες..."
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Γραμμές προτύπου"
          subtitle="Οι ίδιες γραμμές θα αντιγράφονται σε κάθε νέο πρόχειρο."
        />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "18%" }}>Είδος</th>
                  <th>Περιγραφή</th>
                  <th style={{ width: 90 }} className="text-right">
                    Ποσότ.
                  </th>
                  <th style={{ width: 80 }}>Μον.</th>
                  <th style={{ width: 110 }} className="text-right">
                    Τιμή
                  </th>
                  <th style={{ width: 90 }} className="text-right">
                    ΦΠΑ %
                  </th>
                  <th style={{ width: 90 }} className="text-right">
                    Έκπτ. %
                  </th>
                  <th style={{ width: 44 }} />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td>
                      <Select
                        value={l.itemId ?? ""}
                        onChange={(e) => selectItem(i, e.target.value)}
                      >
                        <option value="">— Ελεύθερα —</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td>
                      <Input
                        value={l.description}
                        onChange={(e) =>
                          updateLine(i, { description: e.target.value })
                        }
                        placeholder="Περιγραφή..."
                      />
                    </td>
                    <td>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="text-right"
                        value={l.quantity}
                        onChange={(e) =>
                          updateLine(i, { quantity: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <Input
                        value={l.unit}
                        onChange={(e) =>
                          updateLine(i, { unit: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="text-right"
                        value={l.unitPrice}
                        onChange={(e) =>
                          updateLine(i, { unitPrice: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <Select
                        value={l.vatRate}
                        onChange={(e) =>
                          updateLine(i, { vatRate: e.target.value })
                        }
                      >
                        <option value="0">0</option>
                        <option value="6">6</option>
                        <option value="13">13</option>
                        <option value="24">24</option>
                      </Select>
                    </td>
                    <td>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="text-right"
                        value={l.discountPct}
                        onChange={(e) =>
                          updateLine(i, { discountPct: e.target.value })
                        }
                      />
                    </td>
                    <td className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() =>
                          setLines((rs) =>
                            rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs,
                          )
                        }
                      >
                        <span className="sr-only">Διαγραφή γραμμής</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t-2 border-ink-200 p-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => setLines((rs) => [...rs, emptyLine()])}
            >
              Προσθήκη γραμμής
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/app/documents/repeating")}
        >
          Ακύρωση
        </Button>
        <Button type="submit" icon={Save} disabled={pending}>
          {pending ? "Αποθήκευση..." : "Αποθήκευση προτύπου"}
        </Button>
      </div>
    </form>
  );
}
