import { ArrowLeft, ArrowRight } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";

/**
 * Reusable page-navigation strip. Used at the bottom of every paginated
 * server-rendered list (documents, clients, items, payments, ...).
 *
 * The parent constructs `buildHref(page)` so the URL scheme stays flexible
 * — the shared component doesn't need to know about the surrounding query
 * string (filters, sort, search, etc.).
 */
export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  buildHref,
}: {
  currentPage: number;
  totalPages: number;
  totalCount?: number;
  pageSize?: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1 && !totalCount) return null;

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
    <nav className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="text-ink-700">
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
