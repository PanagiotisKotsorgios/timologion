import { ArrowLeft, ArrowRight } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { PageSizeSelect } from "@/components/ui/PageSizeSelect";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Clamp a raw `size` value from the URL to one of the allowed options.
 * Anything unrecognised falls back to DEFAULT_PAGE_SIZE, so a hand-typed
 * `?size=99999` can't hammer the database.
 */
export function resolvePageSize(raw: string | undefined): number {
  const n = Number(raw ?? "");
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
    ? n
    : DEFAULT_PAGE_SIZE;
}

/**
 * Reusable page-navigation strip. Used at the bottom of every paginated
 * server-rendered list (documents, clients, items, payments, ...).
 *
 * The parent supplies `buildHref(page)` for page navigation and, optionally,
 * `sizeHref(size)` for the "ανά σελίδα" selector — this keeps the query-string
 * shape (filters, sort, search) inside the caller.
 */
export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  buildHref,
  sizeHref,
  pageSizeOptions = [...PAGE_SIZE_OPTIONS],
}: {
  currentPage: number;
  totalPages: number;
  totalCount?: number;
  pageSize?: number;
  buildHref: (page: number) => string;
  sizeHref?: (size: number) => string;
  pageSizeOptions?: number[];
}) {
  if (totalPages <= 1 && !totalCount && !sizeHref) return null;

  const firstOnPage =
    typeof totalCount === "number" && typeof pageSize === "number"
      ? totalCount === 0
        ? 0
        : (currentPage - 1) * pageSize + 1
      : null;
  const lastOnPage =
    typeof totalCount === "number" && typeof pageSize === "number"
      ? Math.min(totalCount, currentPage * pageSize)
      : null;

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm">
      <div className="flex flex-wrap items-center gap-3 text-ink-700">
        {firstOnPage != null && lastOnPage != null && totalCount != null ? (
          <span>
            Εμφάνιση <strong>{firstOnPage.toLocaleString("el-GR")}</strong>–
            <strong>{lastOnPage.toLocaleString("el-GR")}</strong> από{" "}
            <strong>{totalCount.toLocaleString("el-GR")}</strong>
          </span>
        ) : (
          <span>
            Σελίδα <strong>{currentPage}</strong> από{" "}
            <strong>{totalPages}</strong>
          </span>
        )}
        {sizeHref && typeof pageSize === "number" && (
          <span className="flex items-center gap-2">
            <span className="text-ink-500">·</span>
            <label
              htmlFor="page-size-select"
              className="text-ink-500"
            >
              Ανά σελίδα:
            </label>
            <PageSizeSelect
              value={pageSize}
              options={pageSizeOptions}
              sizeHref={sizeHref}
            />
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {currentPage > 1 && (
          <LinkButton
            href={buildHref(currentPage - 1)}
            variant="secondary"
            size="sm"
            icon={ArrowLeft}
          >
            Προηγούμενη
          </LinkButton>
        )}
        {currentPage < totalPages && (
          <LinkButton
            href={buildHref(currentPage + 1)}
            variant="secondary"
            size="sm"
            iconRight={ArrowRight}
          >
            Επόμενη
          </LinkButton>
        )}
      </div>
    </nav>
  );
}
