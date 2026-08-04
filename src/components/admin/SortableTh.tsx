import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { buildListUrl, type SortState } from "@/lib/admin-list";

/**
 * Sortable column header. Clicking cycles desc → asc → cleared for the
 * same field, or switches to the clicked field starting at desc.
 * URL-state based so it works without JS.
 */
export function SortableTh({
  field,
  label,
  current,
  basePath,
  params,
  className,
}: {
  field: string;
  label: string;
  current: SortState<string>;
  basePath: string;
  params: URLSearchParams;
  className?: string;
}) {
  const active = current.field === field;
  let next: { sort: string | null; dir: "asc" | "desc" | null };
  if (!active) {
    next = { sort: field, dir: "desc" };
  } else if (current.dir === "desc") {
    next = { sort: field, dir: "asc" };
  } else {
    next = { sort: null, dir: null };
  }

  const href = buildListUrl(basePath, params, {
    sort: next.sort,
    dir: next.dir,
    // Any sort change should send the user back to page 1.
    page: null,
  });

  const Icon = !active
    ? ArrowUpDown
    : current.dir === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <th className={className}>
      <Link
        href={href}
        className={
          "inline-flex items-center gap-1 hover:text-brand-900 " +
          (active ? "text-brand-900 font-black" : "text-ink-500")
        }
      >
        {label}
        <Icon size={12} strokeWidth={2.5} aria-hidden />
      </Link>
    </th>
  );
}
