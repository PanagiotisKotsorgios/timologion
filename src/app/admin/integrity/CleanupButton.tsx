"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { runCleanupAction } from "./actions";

/**
 * "Καθαρισμός" button per integrity probe. Confirms first so an
 * accidental click doesn't nuke 5k rows. Result count feedback stays
 * on-screen until the next refresh.
 */
export function CleanupButton({
  probeKey,
  count,
}: {
  probeKey: string;
  count: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              `Θα διαγραφούν έως ${count.toLocaleString(
                "el-GR",
              )} rows. Συνέχεια;`,
            )
          )
            return;
          start(async () => {
            const fd = new FormData();
            fd.set("probeKey", probeKey);
            const res = await runCleanupAction(fd);
            if (res.ok) {
              setMsg(`Διαγράφηκαν ${res.deleted.toLocaleString("el-GR")} rows.`);
            } else {
              setMsg(res.error);
            }
            router.refresh();
          });
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border-2 border-red-700 bg-red-600 px-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60"
      >
        <Trash2 size={12} strokeWidth={2.5} aria-hidden />
        {pending ? "Καθαρισμός..." : "Καθαρισμός"}
      </button>
      {msg && <p className="text-[11px] font-bold text-emerald-800">{msg}</p>}
    </div>
  );
}
