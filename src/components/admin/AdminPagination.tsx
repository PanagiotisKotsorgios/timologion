import Link from "next/link";
import { buildListUrl } from "@/lib/admin-list";

/**
 * URL-based pagination footer. Shows current page + total pages, with
 * prev/next links that carry the rest of the URL state (search / sort /
 * date range) forward. Optional page-size picker on the left when
 * `pageSizes` is provided.
 */
export function AdminPagination({
  basePath,
  params,
  page,
  pageSize,
  total,
  pageSizes,
}: {
  basePath: string;
  params: URLSearchParams;
  page: number;
  pageSize: number;
  total: number;
  pageSizes?: number[];
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1 && !pageSizes) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-3 text-ink-500">
        <span>
          {from.toLocaleString("el-GR")}–{to.toLocaleString("el-GR")} από{" "}
          {total.toLocaleString("el-GR")}
        </span>
        {pageSizes && pageSizes.length > 1 && (
          <span className="flex items-center gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest">
              Ανά σελίδα:
            </span>
            {pageSizes.map((n) => (
              <Link
                key={n}
                href={buildListUrl(basePath, params, {
                  pageSize: n,
                  page: null,
                })}
                className={
                  "rounded-md border px-2 py-0.5 text-xs " +
                  (n === pageSize
                    ? "border-brand-800 bg-brand-700 text-white"
                    : "border-ink-300 bg-white text-ink-700 hover:border-ink-500")
                }
              >
                {n}
              </Link>
            ))}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-ink-500">
          Σελίδα {page.toLocaleString("el-GR")} από{" "}
          {totalPages.toLocaleString("el-GR")}
        </span>
        {page > 1 && (
          <Link
            href={buildListUrl(basePath, params, { page: page - 1 })}
            className="inline-flex h-9 items-center rounded-md border-2 border-ink-300 bg-white px-3 text-xs font-bold text-ink-900 hover:border-ink-500"
          >
            Προηγούμενη
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={buildListUrl(basePath, params, { page: page + 1 })}
            className="inline-flex h-9 items-center rounded-md border-2 border-ink-300 bg-white px-3 text-xs font-bold text-ink-900 hover:border-ink-500"
          >
            Επόμενη
          </Link>
        )}
      </div>
    </nav>
  );
}
