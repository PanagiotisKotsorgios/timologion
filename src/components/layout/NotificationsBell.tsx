"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import clsx from "clsx";
import type { Announcement } from "@/lib/announcements";

const STORAGE_KEY = "etl.notifications.readIds.v1";

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function persistReadIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

const toneStyles: Record<Announcement["tone"], string> = {
  info: "border-l-brand-700",
  warning: "border-l-amber-500",
  success: "border-l-emerald-600",
  danger: "border-l-red-600",
};

const toneText: Record<Announcement["tone"], string> = {
  info: "text-brand-900",
  warning: "text-amber-900",
  success: "text-emerald-900",
  danger: "text-red-900",
};

export function NotificationsBell({
  items = [],
}: {
  items?: Announcement[];
}) {
  const ANNOUNCEMENTS = items;

  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const popRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setReadIds(loadReadIds());
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!popRef.current || !btnRef.current) return;
      if (
        !popRef.current.contains(e.target as Node) &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = useMemo(
    () => ANNOUNCEMENTS.filter((a) => !readIds.has(a.id)),
    [readIds],
  );
  const unreadCount = unread.length;

  function markRead(id: string) {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    persistReadIds(next);
  }

  function markAllRead() {
    const next = new Set(readIds);
    ANNOUNCEMENTS.forEach((a) => next.add(a.id));
    setReadIds(next);
    persistReadIds(next);
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-label="Ειδοποιήσεις"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-12 w-12 place-items-center rounded-lg border-2 border-ink-300 bg-white text-ink-900 transition-colors hover:border-ink-500 hover:bg-ink-100"
      >
        <Bell size={20} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full border-2 border-white bg-red-600 px-1 text-[11px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Ειδοποιήσεις"
          className="absolute right-0 top-full z-50 mt-3 w-[min(92vw,560px)] overflow-hidden rounded-2xl border border-ink-300/70 bg-white shadow-2xl md:w-[600px]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-ink-300/60 bg-white px-6 py-4">
            <div>
              <p className="text-lg font-extrabold text-ink-900">
                Ειδοποιήσεις
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                {greekCount(unreadCount)}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-brand-800 transition-colors hover:bg-brand-50 hover:text-brand-900"
              >
                Σήμανση όλων
              </button>
            )}
          </div>

          <ul className="max-h-[360px] divide-y divide-ink-300/50 overflow-y-auto">
            {ANNOUNCEMENTS.length === 0 && (
              <li className="p-10 text-center text-sm text-ink-500">
                Χωρίς ειδοποιήσεις.
              </li>
            )}
            {ANNOUNCEMENTS.map((a) => {
              const isRead = readIds.has(a.id);
              return (
                <li
                  key={a.id}
                  className={clsx(
                    "border-l-[3px] px-5 py-3.5 transition-colors hover:bg-ink-50",
                    toneStyles[a.tone],
                    isRead && "opacity-55",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={clsx(
                            "text-[15px] font-bold leading-tight",
                            toneText[a.tone],
                          )}
                        >
                          {a.title}
                        </p>
                        {!isRead && (
                          <button
                            type="button"
                            onClick={() => markRead(a.id)}
                            aria-label="Σήμανση ως αναγνωσμένη"
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-400 hover:bg-ink-100 hover:text-ink-900"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <div
                        className="prose prose-sm mt-1.5 max-w-none text-[13.5px] leading-relaxed text-ink-800"
                        dangerouslySetInnerHTML={{ __html: a.body }}
                      />
                      {a.href && (
                        <Link
                          href={a.href}
                          onClick={() => {
                            markRead(a.id);
                            setOpen(false);
                          }}
                          className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-brand-800 hover:text-brand-900"
                        >
                          {a.cta ?? "Δείτε εδώ"}
                          <span aria-hidden>→</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-ink-300/60 bg-ink-50 px-5 py-3 text-center">
            <Link
              href="/app/notifications"
              onClick={() => setOpen(false)}
              className="inline-flex text-[13px] font-bold text-brand-800 hover:text-brand-900"
            >
              Όλες οι ειδοποιήσεις →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function greekCount(n: number): string {
  if (n === 0) return "Δεν υπάρχουν νέες ειδοποιήσεις";
  if (n === 1) return "1 νέα ειδοποίηση";
  return `${n} νέες ειδοποιήσεις`;
}
