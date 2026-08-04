import "server-only";

/**
 * Shared helpers for admin list pages: URL-state parsers for
 * pagination / sort / date-range / free-text search, plus a URL
 * builder that carries the current state forward when a control
 * changes just one dimension of it (e.g. changing the sort keeps
 * search + date range intact).
 */

export type PaginationState = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

export function parsePagination(
  params: URLSearchParams,
  defaultPageSize = 30,
): PaginationState {
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    200,
    Math.max(5, Number(params.get("pageSize") ?? defaultPageSize) || defaultPageSize),
  );
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export type SortState<F extends string = string> = {
  field: F | null;
  dir: "asc" | "desc";
};

export function parseSort<F extends string>(
  params: URLSearchParams,
  allowed: readonly F[],
  fallback?: { field: F; dir: "asc" | "desc" },
): SortState<F> {
  const raw = params.get("sort");
  const dir: "asc" | "desc" = params.get("dir") === "asc" ? "asc" : "desc";
  if (raw && allowed.includes(raw as F)) {
    return { field: raw as F, dir };
  }
  if (fallback) return { field: fallback.field, dir: fallback.dir };
  return { field: null, dir };
}

export type DateRange = { from: Date | null; to: Date | null };

export function parseDateRange(params: URLSearchParams): DateRange {
  const fromStr = params.get("from");
  const toStr = params.get("to");
  const from = fromStr ? new Date(fromStr) : null;
  const to = toStr ? new Date(toStr + "T23:59:59") : null;
  if (from && isNaN(from.getTime())) return { from: null, to };
  if (to && isNaN(to.getTime())) return { from, to: null };
  return { from, to };
}

export function parseSearch(params: URLSearchParams): string {
  return params.get("q")?.trim() ?? "";
}

/**
 * Build a URL for the given basePath, merging the current searchParams
 * with the overrides. Passing a value of `null` for an override drops
 * that key from the URL.
 */
export function buildListUrl(
  basePath: string,
  current: URLSearchParams,
  overrides: Record<string, string | number | null | undefined>,
): string {
  const next = new URLSearchParams(current);
  for (const [k, v] of Object.entries(overrides)) {
    if (v === null || v === undefined || v === "") {
      next.delete(k);
    } else {
      next.set(k, String(v));
    }
  }
  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Toggle-sort helper: cycles asc → desc → cleared for the same field,
 * or switches to the new field starting at desc.
 */
export function nextSort<F extends string>(
  current: SortState<F>,
  clicked: F,
): { sort: F | null; dir: "asc" | "desc" | null } {
  if (current.field !== clicked) return { sort: clicked, dir: "desc" };
  if (current.dir === "desc") return { sort: clicked, dir: "asc" };
  return { sort: null, dir: null };
}

/**
 * Prisma-friendly date filter object built from a DateRange. Empty when
 * both bounds are null so `where: { ...whereDate("issueDate", range) }`
 * can be spread unconditionally.
 */
export function whereDate(field: string, range: DateRange): Record<string, unknown> {
  const inner: Record<string, Date> = {};
  if (range.from) inner.gte = range.from;
  if (range.to) inner.lte = range.to;
  if (Object.keys(inner).length === 0) return {};
  return { [field]: inner };
}
