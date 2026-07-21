"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ShieldCheck, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  revokeSessionAction,
  revokeOtherSessionsAction,
  type SessionRow,
} from "./actions";

function parseUserAgent(ua: string | null): string {
  if (!ua) return "Άγνωστη συσκευή";
  // Basic UA sniffing — enough to give the user a recognisable label.
  const isMobile = /iphone|ipad|ipod|android|mobile/i.test(ua);
  let browser = "Browser";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/chrome\//i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua)) browser = "Safari";

  let os = "";
  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";

  return `${browser}${os ? " · " + os : ""}${isMobile ? " (κινητό)" : ""}`;
}

function relative(from: Date | null): string {
  if (!from) return "—";
  const diff = Date.now() - new Date(from).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "τώρα";
  if (mins < 60) return `${mins} λεπτά πριν`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} ώρες πριν`;
  const days = Math.round(hrs / 24);
  return `${days} ημέρες πριν`;
}

export function SessionsList({ sessions }: { sessions: SessionRow[] }) {
  const router = useRouter();
  const [pending, startTx] = useTransition();

  function revoke(id: string) {
    const fd = new FormData();
    fd.set("sessionId", id);
    startTx(async () => {
      await revokeSessionAction(fd);
      router.refresh();
    });
  }

  function revokeOthers() {
    if (!confirm("Αποσύνδεση από όλες τις άλλες συσκευές;")) return;
    startTx(async () => {
      await revokeOtherSessionsAction();
      router.refresh();
    });
  }

  const others = sessions.filter((s) => !s.current);

  return (
    <>
      {others.length > 0 && (
        <div className="flex items-center justify-between border-b-2 border-ink-200 bg-ink-50 px-6 py-3">
          <p className="text-sm text-ink-700">
            {others.length}{" "}
            {others.length === 1 ? "άλλη συνεδρία" : "άλλες συνεδρίες"}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={revokeOthers}
            disabled={pending}
          >
            Αποσύνδεση όλων
          </Button>
        </div>
      )}
      <ul className="divide-y divide-ink-200">
        {sessions.map((s) => {
          const label = parseUserAgent(s.userAgent);
          const isMobile = /κινητό/.test(label);
          return (
            <li
              key={s.id}
              className="flex items-start gap-3 px-6 py-4"
            >
              <span className="mt-0.5 shrink-0 rounded-lg bg-brand-50 p-2 text-brand-800">
                {isMobile ? (
                  <Smartphone size={18} />
                ) : (
                  <Monitor size={18} />
                )}
              </span>
              <div className="flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">
                  {label}
                  {s.current && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                      <ShieldCheck size={11} />
                      Τρέχουσα
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-ink-700">
                  IP: {s.ipAddress ?? "—"} · Τελευταία δραστηριότητα:{" "}
                  {relative(s.lastSeenAt ?? s.createdAt)}
                </p>
              </div>
              {!s.current && (
                <button
                  type="button"
                  onClick={() => revoke(s.id)}
                  disabled={pending}
                  className="mt-1 grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  aria-label="Τερματισμός συνεδρίας"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
