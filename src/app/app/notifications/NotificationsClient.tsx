"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Trash2,
  CheckCheck,
  Filter,
  ArrowUpDown,
  Bell,
} from "lucide-react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import type { Announcement } from "@/lib/announcements";

const READ_KEY = "etl.notifications.readIds.v1";
const DEL_KEY = "etl.notifications.deletedIds.v1";

function loadSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}
function persistSet(key: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify([...ids]));
}

const toneStyles: Record<Announcement["tone"], string> = {
  info: "border-brand-300 bg-brand-50 text-brand-900",
  warning: "border-amber-400 bg-amber-50 text-amber-900",
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  danger: "border-red-300 bg-red-50 text-red-900",
};

const toneLabel: Record<Announcement["tone"], string> = {
  info: "Ενημέρωση",
  warning: "Προσοχή",
  success: "Επιτυχία",
  danger: "Σφάλμα",
};

export function NotificationsClient({
  items,
}: {
  items: Announcement[];
}) {
  const ANNOUNCEMENTS = items;
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [tone, setTone] = useState<"" | Announcement["tone"]>("");
  const [status, setStatus] = useState<"" | "unread" | "read">("");
  const [sort, setSort] = useState<"newest" | "oldest" | "title">("newest");

  useEffect(() => {
    setReadIds(loadSet(READ_KEY));
    setDeletedIds(loadSet(DEL_KEY));
  }, []);

  const markRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    persistSet(READ_KEY, next);
  };
  const markUnread = (id: string) => {
    const next = new Set(readIds);
    next.delete(id);
    setReadIds(next);
    persistSet(READ_KEY, next);
  };
  const deleteOne = (id: string) => {
    const next = new Set(deletedIds);
    next.add(id);
    setDeletedIds(next);
    persistSet(DEL_KEY, next);
  };
  const markAllRead = () => {
    const next = new Set(readIds);
    ANNOUNCEMENTS.forEach((a) => next.add(a.id));
    setReadIds(next);
    persistSet(READ_KEY, next);
  };
  const restoreAll = () => {
    setDeletedIds(new Set());
    persistSet(DEL_KEY, new Set());
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = ANNOUNCEMENTS.filter((a) => !deletedIds.has(a.id))
      .filter((a) => (tone ? a.tone === tone : true))
      .filter((a) => {
        if (status === "unread") return !readIds.has(a.id);
        if (status === "read") return readIds.has(a.id);
        return true;
      })
      .filter((a) =>
        term
          ? a.title.toLowerCase().includes(term) ||
            a.body.toLowerCase().includes(term)
          : true,
      );

    const sorted = [...list].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "el");
      if (sort === "oldest")
        return a.publishedAt.localeCompare(b.publishedAt);
      return b.publishedAt.localeCompare(a.publishedAt);
    });
    return sorted;
  }, [q, tone, status, sort, readIds, deletedIds]);

  const totals = useMemo(() => {
    const total = ANNOUNCEMENTS.filter((a) => !deletedIds.has(a.id)).length;
    const unread = ANNOUNCEMENTS.filter(
      (a) => !deletedIds.has(a.id) && !readIds.has(a.id),
    ).length;
    return { total, unread, deleted: deletedIds.size };
  }, [readIds, deletedIds]);

  return (
    <>
      <div className="mb-6 grid gap-3 rounded-2xl border-2 border-ink-300 bg-white p-4 md:grid-cols-12">
        <Field label="Αναζήτηση" htmlFor="q" className="md:col-span-4">
          <Input
            id="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Τίτλος ή περιεχόμενο..."
          />
        </Field>
        <Field label="Είδος" htmlFor="tone" className="md:col-span-3">
          <Select
            id="tone"
            value={tone}
            onChange={(e) =>
              setTone(e.target.value as "" | Announcement["tone"])
            }
          >
            <option value="">Όλα τα είδη</option>
            <option value="info">Ενημέρωση</option>
            <option value="warning">Προσοχή</option>
            <option value="success">Επιτυχία</option>
          </Select>
        </Field>
        <Field label="Κατάσταση" htmlFor="status" className="md:col-span-2">
          <Select
            id="status"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "" | "unread" | "read")
            }
          >
            <option value="">Όλες</option>
            <option value="unread">Μη αναγνωσμένες</option>
            <option value="read">Αναγνωσμένες</option>
          </Select>
        </Field>
        <Field label="Ταξινόμηση" htmlFor="sort" className="md:col-span-3">
          <Select
            id="sort"
            value={sort}
            onChange={(e) =>
              setSort(e.target.value as "newest" | "oldest" | "title")
            }
          >
            <option value="newest">Νεότερες πρώτα</option>
            <option value="oldest">Παλαιότερες πρώτα</option>
            <option value="title">Αλφαβητικά</option>
          </Select>
        </Field>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-700">
          <strong className="text-ink-900">{filtered.length}</strong> από{" "}
          <strong className="text-ink-900">{totals.total}</strong> ειδοποιήσεις
          {" · "}
          <span className="text-brand-800">{totals.unread} μη αναγνωσμένες</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {totals.unread > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={CheckCheck}
              onClick={markAllRead}
            >
              Σήμανση όλων ως αναγνωσμένα
            </Button>
          )}
          {totals.deleted > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={restoreAll}
              icon={Bell}
            >
              Επαναφορά διεγραμμένων ({totals.deleted})
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardBody className="p-16 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ink-100 text-ink-500">
              <Bell size={24} aria-hidden />
            </div>
            <p className="mt-4 text-lg font-semibold text-ink-900">
              Δεν βρέθηκαν ειδοποιήσεις.
            </p>
            <p className="mt-1 text-sm text-ink-700">
              Δοκίμασε να αλλάξεις τα φίλτρα.
            </p>
          </CardBody>
        </Card>
      ) : (
        <ul className="space-y-3">
          {filtered.map((a) => {
            const isRead = readIds.has(a.id);
            return (
              <li key={a.id}>
                <Card className={clsx(!isRead && "shadow-soft")}>
                  <CardBody
                    className={clsx(
                      "border-l-4",
                      toneStyles[a.tone],
                      isRead && "opacity-70",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-current px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                            {toneLabel[a.tone]}
                          </span>
                          {!isRead && (
                            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              Νέα
                            </span>
                          )}
                          <span className="text-xs text-ink-700">
                            {new Date(a.publishedAt).toLocaleDateString("el-GR")}
                          </span>
                        </div>
                        <h3 className="mt-2 text-lg font-bold text-ink-900">
                          {a.title}
                        </h3>
                        <div
                          className="prose prose-sm mt-2 max-w-none text-[15px] leading-relaxed text-ink-900"
                          dangerouslySetInnerHTML={{ __html: a.body }}
                        />
                        {a.href && (
                          <Link
                            href={a.href}
                            onClick={() => markRead(a.id)}
                            className="mt-3 inline-flex text-sm font-bold text-brand-800 hover:text-brand-900"
                          >
                            {a.cta ?? "Δείτε εδώ"} →
                          </Link>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {isRead ? (
                          <button
                            type="button"
                            onClick={() => markUnread(a.id)}
                            className="grid h-10 w-10 place-items-center rounded-lg border-2 border-ink-300 bg-white text-ink-900 hover:bg-ink-100"
                            aria-label="Σήμανση ως μη αναγνωσμένη"
                            title="Σήμανση ως μη αναγνωσμένη"
                          >
                            <Bell size={16} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => markRead(a.id)}
                            className="grid h-10 w-10 place-items-center rounded-lg border-2 border-ink-300 bg-white text-ink-900 hover:bg-ink-100"
                            aria-label="Σήμανση ως αναγνωσμένη"
                            title="Σήμανση ως αναγνωσμένη"
                          >
                            <CheckCheck size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteOne(a.id)}
                          className="grid h-10 w-10 place-items-center rounded-lg border-2 border-red-200 bg-white text-red-700 hover:bg-red-50"
                          aria-label="Διαγραφή"
                          title="Διαγραφή"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
