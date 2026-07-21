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
          className="absolute right-0 top-full z-50 mt-3 w-[380px] overflow-hidden rounded-2xl border-2 border-ink-300 bg-white shadow-soft md:w-[420px]"
        >
          <div className="flex items-center justify-between border-b-2 border-ink-300/60 bg-brand-50 px-5 py-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-brand-900">
                Ειδοποιήσεις
              </p>
              <p className="text-xs text-ink-700">
                {greekCount(unreadCount)}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-bold text-brand-800 hover:text-brand-900"
              >
                Σήμανση όλων ως αναγνωσμένα
              </button>
            )}
          </div>

          <ul className="max-h-[420px] divide-y-2 divide-ink-300/60 overflow-y-auto">
            {ANNOUNCEMENTS.length === 0 && (
              <li className="p-6 text-center text-sm text-ink-700">
                Χωρίς ειδοποιήσεις.
              </li>
            )}
            {ANNOUNCEMENTS.map((a) => {
              const isRead = readIds.has(a.id);
              return (
                <li
                  key={a.id}
                  className={clsx(
                    "border-l-4 px-4 py-4",
                    toneStyles[a.tone],
                    isRead && "opacity-60",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p
                        className={clsx(
                          "text-sm font-bold",
                          toneText[a.tone],
                        )}
                      >
                        {a.title}
                      </p>
                      <div
                        className="prose prose-sm mt-1 max-w-none text-[13px] leading-relaxed text-ink-900"
                        dangerouslySetInnerHTML={{ __html: a.body }}
                      />
                      {a.href && (
                        <Link
                          href={a.href}
                          onClick={() => {
                            markRead(a.id);
                            setOpen(false);
                          }}
                          className="mt-2 inline-flex text-xs font-bold text-brand-800 hover:text-brand-900"
                        >
                          {a.cta ?? "Δείτε εδώ"} →
                        </Link>
                      )}
                    </div>
                    {!isRead && (
                      <button
                        type="button"
                        onClick={() => markRead(a.id)}
                        aria-label="Σήμανση ως αναγνωσμένη"
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="border-t-2 border-ink-300/60 bg-ink-100 px-5 py-3 text-center">
            <Link
              href="/app/notifications"
              onClick={() => setOpen(false)}
              className="inline-flex text-sm font-bold text-brand-800 hover:text-brand-900"
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
