/**
 * Deterministic per-staff colour palette. Used to tint the appointment
 * chip in the calendar so users can spot at a glance who a slot belongs
 * to without reading names.
 *
 * A hash of the staff id picks one of 10 curated shades. Same id → same
 * colour across the whole app, no DB column needed.
 */
const PALETTE = [
  { bg: "bg-brand-100", ring: "ring-brand-800", text: "text-brand-900", dot: "bg-brand-700" },
  { bg: "bg-emerald-100", ring: "ring-emerald-700", text: "text-emerald-900", dot: "bg-emerald-600" },
  { bg: "bg-amber-100", ring: "ring-amber-700", text: "text-amber-900", dot: "bg-amber-600" },
  { bg: "bg-purple-100", ring: "ring-purple-700", text: "text-purple-900", dot: "bg-purple-600" },
  { bg: "bg-rose-100", ring: "ring-rose-700", text: "text-rose-900", dot: "bg-rose-600" },
  { bg: "bg-sky-100", ring: "ring-sky-700", text: "text-sky-900", dot: "bg-sky-600" },
  { bg: "bg-teal-100", ring: "ring-teal-700", text: "text-teal-900", dot: "bg-teal-600" },
  { bg: "bg-orange-100", ring: "ring-orange-700", text: "text-orange-900", dot: "bg-orange-600" },
  { bg: "bg-fuchsia-100", ring: "ring-fuchsia-700", text: "text-fuchsia-900", dot: "bg-fuchsia-600" },
  { bg: "bg-slate-200", ring: "ring-slate-700", text: "text-slate-900", dot: "bg-slate-600" },
];

export type StaffColor = (typeof PALETTE)[number];

function hashCode(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function colorForStaff(id: string | null | undefined): StaffColor {
  if (!id) return PALETTE[9]!; // slate/gray for unassigned
  return PALETTE[hashCode(id) % PALETTE.length]!;
}
