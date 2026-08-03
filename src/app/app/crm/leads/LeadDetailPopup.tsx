"use client";

import { useEffect, useState } from "react";
import {
  X,
  Mail,
  Phone,
  Building2,
  User,
  Calendar,
  Sparkles,
  FileText,
  ExternalLink,
  Copy,
} from "lucide-react";

const STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  new: {
    label: "Νέος",
    className: "border-brand-300 bg-brand-100 text-brand-900",
  },
  contacted: {
    label: "Επαφή",
    className: "border-amber-300 bg-amber-100 text-amber-900",
  },
  qualified: {
    label: "Κατάλληλος",
    className: "border-emerald-300 bg-emerald-100 text-emerald-900",
  },
  disqualified: {
    label: "Απορρίφθηκε",
    className: "border-ink-300 bg-ink-100 text-ink-700",
  },
  converted: {
    label: "Πελάτης",
    className: "border-emerald-500 bg-emerald-500 text-white",
  },
};

export type LeadDetail = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Read-only detail popup for a lead. Clicking a lead row on the list
 * opens this — everything on the record in one glance, with quick
 * mailto / tel / copy shortcuts so the operator can act immediately.
 *
 * Not editable inline; status changes still go through the row select
 * on the list. Popup is intentionally focused on "get the info fast".
 */
export function LeadDetailPopup({
  lead,
  onClose,
}: {
  lead: LeadDetail;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"email" | "phone" | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function copy(text: string, which: "email" | "phone") {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const statusMeta = STATUS_META[lead.status] ?? {
    label: lead.status,
    className: "border-ink-300 bg-ink-100 text-ink-700",
  };
  const created = new Date(lead.createdAt);
  const updated = new Date(lead.updatedAt);
  const initials = lead.fullName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-popup-title"
      className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto p-4 py-10 sm:p-8"
    >
      <button
        type="button"
        aria-label="Κλείσιμο"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-ink-300/70 bg-white shadow-2xl">
        {/* Header — colored per status so the popup reads at a glance. */}
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-900 to-brand-800 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15 text-lg font-black text-white shadow-inner">
                {initials || "?"}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
                  Lead
                </p>
                <h2
                  id="lead-popup-title"
                  className="mt-0.5 text-xl font-extrabold sm:text-2xl"
                >
                  {lead.fullName}
                </h2>
                {lead.company && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/80">
                    <Building2 size={13} aria-hidden />
                    {lead.company}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              aria-label="Κλείσιμο"
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest ${statusMeta.className}`}
            >
              {statusMeta.label}
            </span>
            {lead.source && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/90">
                Πηγή · {lead.source}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="space-y-5 p-6">
          {/* Contact actions */}
          <div className="grid gap-2 sm:grid-cols-2">
            {lead.email ? (
              <div className="flex items-center gap-2 rounded-lg border-2 border-ink-200 bg-white p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-100 text-cyan-800">
                  <Mail size={16} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
                    Email
                  </p>
                  <a
                    href={`mailto:${lead.email}`}
                    className="mt-0.5 block truncate text-sm font-bold text-brand-800 hover:text-brand-900"
                  >
                    {lead.email}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => copy(lead.email!, "email")}
                  title="Αντιγραφή"
                  aria-label="Αντιγραφή email"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                >
                  <Copy size={14} aria-hidden />
                </button>
              </div>
            ) : (
              <EmptyContact icon={Mail} label="Χωρίς email" />
            )}

            {lead.phone ? (
              <div className="flex items-center gap-2 rounded-lg border-2 border-ink-200 bg-white p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
                  <Phone size={16} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
                    Τηλέφωνο
                  </p>
                  <a
                    href={`tel:${lead.phone}`}
                    className="mt-0.5 block truncate text-sm font-bold text-brand-800 hover:text-brand-900"
                  >
                    {lead.phone}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => copy(lead.phone!, "phone")}
                  title="Αντιγραφή"
                  aria-label="Αντιγραφή τηλεφώνου"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                >
                  <Copy size={14} aria-hidden />
                </button>
              </div>
            ) : (
              <EmptyContact icon={Phone} label="Χωρίς τηλέφωνο" />
            )}
          </div>

          {copied && (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
              ✓ {copied === "email" ? "Το email" : "Το τηλέφωνο"} αντιγράφηκε
              στο πρόχειρο.
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-ink-500">
              <FileText size={11} aria-hidden />
              Σημειώσεις
            </p>
            {lead.notes ? (
              <p className="whitespace-pre-wrap rounded-lg border-2 border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-ink-900">
                {lead.notes}
              </p>
            ) : (
              <p className="rounded-lg border-2 border-dashed border-ink-300 bg-ink-50/50 px-4 py-3 text-sm italic text-ink-500">
                Δεν έχουν καταχωρηθεί σημειώσεις για αυτόν τον lead.
              </p>
            )}
          </div>

          {/* Meta */}
          <div className="grid gap-2 rounded-lg bg-ink-50/60 p-3 text-[11px] sm:grid-cols-2">
            <div className="flex items-center gap-1.5">
              <Calendar size={11} className="text-ink-500" aria-hidden />
              <span className="text-ink-700">Δημιουργήθηκε:</span>
              <span className="font-bold text-ink-900">
                {created.toLocaleDateString("el-GR")}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles size={11} className="text-ink-500" aria-hidden />
              <span className="text-ink-700">Ενημερώθηκε:</span>
              <span className="font-bold text-ink-900">
                {updated.toLocaleDateString("el-GR")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:col-span-2">
              <User size={11} className="text-ink-500" aria-hidden />
              <span className="mono text-ink-500">ID</span>
              <span className="mono text-ink-900">
                {lead.id.slice(-10).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 border-t border-ink-200 pt-4">
            {lead.email && (
              <a
                href={`mailto:${lead.email}?subject=Follow-up`}
                className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-cyan-700 bg-cyan-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-cyan-700"
              >
                <Mail size={14} strokeWidth={2.5} aria-hidden />
                Αποστολή email
              </a>
            )}
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-emerald-700 bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                <Phone size={14} strokeWidth={2.5} aria-hidden />
                Κλήση
              </a>
            )}
            <a
              href={`/app/crm/pipeline`}
              className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-brand-800 bg-brand-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-brand-800"
            >
              <ExternalLink size={14} strokeWidth={2.5} aria-hidden />
              Άνοιγμα στη ροή
            </a>
          </div>
        </div>

        <div className="flex justify-end border-t border-ink-300/60 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-lg border-2 border-ink-300 bg-white px-5 text-sm font-bold text-ink-900 hover:bg-ink-100"
          >
            Κλείσιμο
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyContact({
  icon: Icon,
  label,
}: {
  icon: typeof Mail;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border-2 border-dashed border-ink-300 bg-ink-50/50 p-3 text-ink-500">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-ink-400">
        <Icon size={16} aria-hidden />
      </div>
      <p className="text-sm italic">{label}</p>
    </div>
  );
}
