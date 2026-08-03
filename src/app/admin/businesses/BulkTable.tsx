"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PowerOff, Power, Tag, FileSpreadsheet, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { bulkBusinessAction } from "./bulk-actions";

type Row = {
  id: string;
  legalName: string;
  tradeName: string | null;
  vatNumber: string;
  city: string | null;
  createdAt: string;
  revenue: number;
  members: number;
  documents: number;
  wrappStatus: string | null;
  suspendedAt: string | null;
};

const nfEur = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});
const nfDate = new Intl.DateTimeFormat("el-GR");

export function BulkTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const allChecked = rows.length > 0 && selected.size === rows.length;

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    setSelected((s) =>
      s.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
    );
  }

  function run(action: "suspend" | "unsuspend" | "tag") {
    if (selected.size === 0) return;
    let extra = "";
    if (action === "tag") {
      const t = window.prompt(
        "Tags (χωρισμένα με κόμμα) για προσθήκη σε όλες τις επιλεγμένες:",
      );
      if (!t) return;
      extra = t;
    } else if (action === "suspend") {
      const r = window.prompt(
        `Αναστολή ${selected.size} επιχειρήσεων — αιτιολογία (προαιρετικά):`,
      );
      if (r === null) return;
      extra = r;
    } else if (action === "unsuspend") {
      if (!window.confirm(`Άρση αναστολής σε ${selected.size} επιχειρήσεις;`))
        return;
    }

    const fd = new FormData();
    fd.set("action", action);
    fd.set("ids", Array.from(selected).join(","));
    fd.set("extra", extra);
    setMsg(null);
    start(async () => {
      const res = await bulkBusinessAction(fd);
      if (res.ok) {
        setMsg(
          `Έγινε σε ${res.affected} επιχειρήσεις.` +
            (res.skipped > 0 ? ` (${res.skipped} παραλείφθηκαν)` : ""),
        );
        setSelected(new Set());
        router.refresh();
      } else {
        setMsg(res.error);
      }
    });
  }

  function exportSelected() {
    if (selected.size === 0) return;
    const ids = Array.from(selected).join(",");
    window.location.href = `/api/admin/export/businesses?ids=${encodeURIComponent(ids)}`;
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="sticky top-16 z-20 mb-4 flex flex-wrap items-center gap-2 rounded-xl border-2 border-brand-800 bg-brand-700 p-3 text-white shadow-lg">
          <span className="mr-2 text-sm font-black uppercase tracking-widest">
            {selected.size} επιλεγμένες
          </span>
          <button
            type="button"
            onClick={() => run("suspend")}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border-2 border-red-500 bg-red-600 px-3 text-xs font-bold hover:bg-red-700 disabled:opacity-60"
          >
            <PowerOff size={13} strokeWidth={2.5} />
            Αναστολή
          </button>
          <button
            type="button"
            onClick={() => run("unsuspend")}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border-2 border-emerald-400 bg-emerald-600 px-3 text-xs font-bold hover:bg-emerald-700 disabled:opacity-60"
          >
            <Power size={13} strokeWidth={2.5} />
            Άρση αναστολής
          </button>
          <button
            type="button"
            onClick={() => run("tag")}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border-2 border-amber-300 bg-amber-500 px-3 text-xs font-bold text-black hover:bg-amber-600 disabled:opacity-60"
          >
            <Tag size={13} strokeWidth={2.5} />
            + tags
          </button>
          <button
            type="button"
            onClick={exportSelected}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border-2 border-white/40 bg-white/10 px-3 text-xs font-bold hover:bg-white/20 disabled:opacity-60"
          >
            <FileSpreadsheet size={13} strokeWidth={2.5} />
            Export XLSX
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border-2 border-white/40 bg-transparent px-3 text-xs font-bold hover:bg-white/10"
          >
            <X size={13} strokeWidth={2.5} />
            Άκυρο
          </button>
        </div>
      )}
      {msg && (
        <p className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">
          {msg}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border-2 border-ink-300 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-3 py-2 text-left w-8">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-ink-500 text-brand-700"
                  aria-label="Επιλογή όλων"
                />
              </th>
              <th className="px-4 py-2 text-left">Επιχείρηση</th>
              <th className="px-4 py-2 text-left">ΑΦΜ</th>
              <th className="px-4 py-2 text-left">Πόλη</th>
              <th className="px-4 py-2 text-right">Μέλη</th>
              <th className="px-4 py-2 text-right">Παραστ.</th>
              <th className="px-4 py-2 text-right">Έσοδα</th>
              <th className="px-4 py-2 text-left">Πάροχος</th>
              <th className="px-4 py-2 text-left">Ημ/νία</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-300/60">
            {rows.map((b) => {
              const checked = selected.has(b.id);
              return (
                <tr
                  key={b.id}
                  className={
                    "hover:bg-ink-100/60 " + (checked ? "bg-brand-50/60" : "")
                  }
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(b.id)}
                      className="h-4 w-4 rounded border-ink-500 text-brand-700"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/businesses/${b.id}`}
                      className="font-medium text-brand-700 hover:text-brand-800"
                    >
                      {b.tradeName ?? b.legalName}
                    </Link>
                    {b.suspendedAt && (
                      <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800">
                        SUSPENDED
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-ink-700">{b.vatNumber}</td>
                  <td className="px-4 py-2 text-ink-700">{b.city ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{b.members}</td>
                  <td className="px-4 py-2 text-right">{b.documents}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {nfEur.format(b.revenue)}
                  </td>
                  <td className="px-4 py-2">
                    <WrappBadge status={b.wrappStatus ?? undefined} />
                  </td>
                  <td className="px-4 py-2 text-ink-500">
                    {nfDate.format(new Date(b.createdAt))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function WrappBadge({ status }: { status?: string }) {
  if (!status || status === "inactive")
    return <Badge tone="muted">Ανενεργός</Badge>;
  if (status === "active") return <Badge tone="success">Ενεργός</Badge>;
  if (status === "pending") return <Badge tone="warning">Σε αναμονή</Badge>;
  return <Badge tone="danger">Σφάλμα</Badge>;
}
