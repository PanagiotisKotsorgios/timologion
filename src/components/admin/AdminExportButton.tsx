import { FileSpreadsheet } from "lucide-react";

/**
 * Anchor-only export button. GET on /api/admin/export/[entity] returns
 * an XLSX with Content-Disposition: attachment, so the browser
 * downloads without a client component. searchParams get forwarded
 * verbatim — the export routes read the same query params as the list
 * page they sit on, so a filtered list exports a filtered file.
 */
export function AdminExportButton({
  entity,
  params,
  label = "Εξαγωγή XLSX",
}: {
  entity:
    | "businesses"
    | "users"
    | "documents"
    | "audit"
    | "errors"
    | "webhooks"
    | "backups";
  params?: Record<string, string | undefined>;
  label?: string;
}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v) qs.set(k, v);
  }
  const query = qs.toString();
  const href = `/api/admin/export/${entity}${query ? `?${query}` : ""}`;
  return (
    <a
      href={href}
      className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-emerald-700 bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
    >
      <FileSpreadsheet size={14} strokeWidth={2.5} aria-hidden />
      {label}
    </a>
  );
}
