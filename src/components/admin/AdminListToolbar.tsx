import { Input } from "@/components/ui/Input";
import { Search } from "lucide-react";

/**
 * Standard filter bar for admin list pages: free-text search + optional
 * date-range picker + any extra chips passed in as children. Renders as
 * a GET form so the query params flow through the URL — pages read the
 * same URLSearchParams for parsing.
 */
export function AdminListToolbar({
  action,
  search,
  from,
  to,
  showDate = true,
  hidden = {},
  extras,
}: {
  action: string;
  search: string;
  from?: string;
  to?: string;
  showDate?: boolean;
  hidden?: Record<string, string | undefined>;
  extras?: React.ReactNode;
}) {
  return (
    <form
      action={action}
      method="get"
      className="mb-4 grid gap-3 md:grid-cols-4"
    >
      <div className="relative md:col-span-2">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
          aria-hidden
        />
        <Input
          name="q"
          defaultValue={search}
          placeholder="Αναζήτηση..."
          className="pl-9"
        />
      </div>
      {showDate && (
        <>
          <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-ink-500">
            Από
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className="h-11 rounded-lg border-2 border-ink-300 bg-white px-3 text-sm text-ink-900 focus:border-brand-700 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-ink-500">
            Έως
            <input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="h-11 rounded-lg border-2 border-ink-300 bg-white px-3 text-sm text-ink-900 focus:border-brand-700 focus:outline-none"
            />
          </label>
        </>
      )}
      {Object.entries(hidden).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}
      {extras}
      {/* Submit is optional — inputs auto-submit on change won't happen
          here (server component), but pressing Enter submits the form. */}
      <button type="submit" className="sr-only">
        Εφαρμογή
      </button>
    </form>
  );
}
