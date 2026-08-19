import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import type { UiPreview } from "./content";

/**
 * Renders a small, deterministic UI mockup next to a step's body text.
 * Used inside guide sections so readers see visually what button /
 * card / field the copy is referring to, without needing screenshot
 * files that would drift as the app evolves.
 */
export function GuidePreview({ preview }: { preview: UiPreview }) {
  return (
    <div className="mt-4 rounded-2xl border-2 border-dashed border-black/15 bg-brand-50/40 p-5">
      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-brand-900/50">
        Έτσι φαίνεται στην εφαρμογή
      </p>
      {renderPreview(preview)}
    </div>
  );
}

function renderPreview(p: UiPreview) {
  switch (p.kind) {
    case "button":
      return <ButtonPreview label={p.label} tone={p.tone ?? "primary"} />;
    case "toolbar":
      return (
        <div className="flex flex-wrap gap-2">
          {p.items.map((it, i) => (
            <ButtonPreview
              key={i}
              label={it.label}
              tone={it.tone === "muted" ? "secondary" : it.tone ?? "secondary"}
              size="sm"
            />
          ))}
        </div>
      );
    case "card":
      return <CardPreview {...p} />;
    case "stat":
      return <StatPreview {...p} />;
    case "field":
      return <FieldPreview {...p} />;
    case "note":
      return <NotePreview {...p} />;
  }
}

function ButtonPreview({
  label,
  tone,
  size = "md",
}: {
  label: string;
  tone: "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md";
}) {
  const base =
    "inline-flex items-center gap-2 rounded-lg border-2 font-bold shadow-sm";
  const sizeClasses = size === "sm" ? "h-9 px-3 text-xs" : "h-11 px-4 text-sm";
  const toneClasses = {
    primary: "border-brand-800 bg-brand-700 text-white",
    secondary: "border-ink-300 bg-white text-ink-900",
    danger: "border-red-700 bg-red-600 text-white",
    success: "border-emerald-700 bg-emerald-600 text-white",
  }[tone];
  return <span className={`${base} ${sizeClasses} ${toneClasses}`}>{label}</span>;
}

function CardPreview({
  title,
  body,
  badge,
  badgeTone = "muted",
}: {
  title: string;
  body: string;
  badge?: string;
  badgeTone?: "success" | "warning" | "muted";
}) {
  const badgeClasses = {
    success: "bg-emerald-100 text-emerald-800 border-emerald-300",
    warning: "bg-amber-100 text-amber-800 border-amber-300",
    muted: "bg-ink-100 text-ink-700 border-ink-300",
  }[badgeTone];
  return (
    <div className="rounded-xl border-2 border-ink-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-black text-brand-900">{title}</p>
        {badge && (
          <span
            className={`shrink-0 rounded-md border-2 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${badgeClasses}`}
          >
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-ink-700">{body}</p>
    </div>
  );
}

function StatPreview({
  label,
  value,
  hint,
  tone = "brand",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "brand" | "emerald" | "amber";
}) {
  const toneClasses = {
    brand: "text-brand-900",
    emerald: "text-emerald-900",
    amber: "text-amber-900",
  }[tone];
  return (
    <div className="rounded-xl border-2 border-ink-200 bg-white p-4">
      <p className={`text-[10px] font-black uppercase tracking-widest ${toneClasses}`}>
        {label}
      </p>
      <p className="mt-2 text-3xl font-extrabold leading-none tracking-tight text-ink-900">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs font-medium text-ink-700">{hint}</p>}
    </div>
  );
}

function FieldPreview({
  label,
  placeholder,
  hint,
  required,
}: {
  label: string;
  placeholder: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-ink-900">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      <div className="h-12 w-full rounded-lg border-2 border-ink-300 bg-white px-4 leading-[2.75rem] text-base text-ink-500">
        {placeholder}
      </div>
      {hint && <p className="mt-1.5 text-xs text-ink-700">{hint}</p>}
    </div>
  );
}

function NotePreview({
  body,
  tone = "info",
}: {
  body: string;
  tone?: "info" | "warning" | "success" | "danger";
}) {
  const map = {
    info: {
      cls: "border-brand-300 bg-brand-50 text-brand-900",
      Icon: Info,
    },
    warning: {
      cls: "border-amber-300 bg-amber-50 text-amber-900",
      Icon: AlertTriangle,
    },
    success: {
      cls: "border-emerald-300 bg-emerald-50 text-emerald-900",
      Icon: CheckCircle2,
    },
    danger: {
      cls: "border-red-300 bg-red-50 text-red-900",
      Icon: X,
    },
  }[tone];
  const Icon = map.Icon;
  return (
    <div className={`flex items-start gap-3 rounded-lg border-2 p-4 ${map.cls}`}>
      <Icon size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden />
      <p className="text-sm font-semibold leading-relaxed">{body}</p>
    </div>
  );
}
