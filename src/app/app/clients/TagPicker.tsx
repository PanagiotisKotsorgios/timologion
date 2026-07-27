"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, X, Check, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createTagAction, setClientTagsAction } from "./tag-actions";

export type TagOption = { id: string; label: string; color: string };

export function TagPicker({
  clientId,
  allTags,
  initialSelected,
}: {
  clientId: string;
  allTags: TagOption[];
  initialSelected: string[];
}) {
  const [tags, setTags] = useState<TagOption[]>(allTags);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialSelected),
  );
  const [showNew, setShowNew] = useState(false);
  const [pending, startTx] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    startTx(async () => {
      const res = await setClientTagsAction(clientId, [...next]);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md bg-red-50 p-2 text-sm text-red-800">{error}</p>
      )}

      {tags.length === 0 && selected.size === 0 && (
        <p className="text-sm text-ink-500">
          Δεν έχεις ετικέτες ακόμη — δημιούργησέ την πρώτη.
        </p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => {
            const on = selected.has(t.id);
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => toggle(t.id)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-semibold transition-colors disabled:opacity-60"
                style={{
                  borderColor: t.color,
                  background: on ? t.color : "transparent",
                  color: on ? "#fff" : t.color,
                }}
              >
                <TagIcon size={12} aria-hidden />
                {t.label}
                {on && <X size={12} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}

      <div className="pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowNew(true)}
          icon={Plus}
        >
          Νέα ετικέτα
        </Button>
      </div>

      {showNew && (
        <NewTagModal
          clientId={clientId}
          currentSelected={selected}
          onClose={() => setShowNew(false)}
          onCreated={(tag, nextSelected) => {
            setTags((prev) =>
              prev.some((t) => t.id === tag.id) ? prev : [...prev, tag],
            );
            setSelected(nextSelected);
            setShowNew(false);
          }}
          onError={(msg) => setError(msg)}
        />
      )}
    </div>
  );
}

function NewTagModal({
  clientId,
  currentSelected,
  onClose,
  onCreated,
  onError,
}: {
  clientId: string;
  currentSelected: Set<string>;
  onClose: () => void;
  onCreated: (tag: TagOption, nextSelected: Set<string>) => void;
  onError: (msg: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#0B1B3A");
  const [pending, startTx] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function submit() {
    if (!label.trim()) return;
    setError(null);
    const fd = new FormData();
    fd.set("label", label.trim());
    fd.set("color", color);
    startTx(async () => {
      const res = await createTagAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const trimmed = label.trim();
      const nextSel = new Set(currentSelected).add(res.id);
      const saveRes = await setClientTagsAction(clientId, [...nextSel]);
      if (!saveRes.ok) {
        onError(saveRes.error);
        return;
      }
      onCreated({ id: res.id, label: trimmed, color }, nextSel);
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-tag-title"
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 py-10 sm:p-8"
    >
      <button
        type="button"
        aria-label="Κλείσιμο"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-ink-300/70 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-ink-300/60 px-8 py-6">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-800">
              <TagIcon size={22} aria-hidden />
            </div>
            <div>
              <h2
                id="new-tag-title"
                className="text-2xl font-extrabold text-brand-900 md:text-3xl"
              >
                Νέα ετικέτα
              </h2>
              <p className="mt-1 text-sm text-ink-700">
                Δώσε όνομα και χρώμα — θα εμφανιστεί σε όλους τους πελάτες.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Κλείσιμο"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 px-8 py-6">
          {error && (
            <p className="rounded-md bg-red-50 p-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <div>
            <label
              htmlFor="new-tag-label"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-ink-500"
            >
              Όνομα ετικέτας
            </label>
            <Input
              id="new-tag-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="π.χ. VIP, Χονδρική"
              maxLength={60}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-ink-500"
            >
              Χρώμα
            </label>
            <ColorSwatchPicker value={color} onChange={setColor} />
            <div className="mt-4 flex items-center justify-between rounded-2xl border-2 border-dashed border-ink-300 bg-ink-50/60 p-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-ink-500">
                Προεπισκόπηση
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-sm"
                style={{ background: color }}
              >
                <TagIcon size={13} aria-hidden />
                {label.trim() || "Νέα ετικέτα"}
              </span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={pending}
            >
              Άκυρο
            </Button>
            <Button
              type="button"
              onClick={submit}
              icon={Plus}
              disabled={pending || !label.trim()}
            >
              {pending ? "Δημιουργία..." : "Δημιουργία"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Swatch-based color picker with a curated palette + fine-grained custom
 * override. Beats the native `<input type="color">` because:
 *   - The palette is curated for tag chips (readable on white with white
 *     text on the fill).
 *   - No OS-specific picker dialog, so the modal doesn't lose focus.
 *   - "Άλλο" reveals the native input as an escape hatch for edge cases.
 */
const TAG_PALETTE: { color: string; name: string }[] = [
  { color: "#0B1B3A", name: "Βαθύ μπλε" },
  { color: "#25457b", name: "Ναυτικό" },
  { color: "#0ea5e9", name: "Γαλάζιο" },
  { color: "#059669", name: "Πράσινο" },
  { color: "#65a30d", name: "Λαχανί" },
  { color: "#f59e0b", name: "Πορτοκαλί" },
  { color: "#dc2626", name: "Κόκκινο" },
  { color: "#db2777", name: "Ροζ" },
  { color: "#7c3aed", name: "Μωβ" },
  { color: "#334155", name: "Γκρι" },
];

function ColorSwatchPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const normalized = value.toLowerCase();
  const isPreset = TAG_PALETTE.some((p) => p.color.toLowerCase() === normalized);
  const [customOpen, setCustomOpen] = useState(!isPreset);

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Επιλογή χρώματος"
        className="grid grid-cols-5 gap-3"
      >
        {TAG_PALETTE.map((p) => {
          const active = p.color.toLowerCase() === normalized;
          return (
            <button
              key={p.color}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={p.name}
              title={p.name}
              onClick={() => {
                onChange(p.color);
                setCustomOpen(false);
              }}
              className={
                "relative grid h-11 place-items-center rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-800 " +
                (active
                  ? "border-brand-900 shadow-inner ring-2 ring-brand-900/40 scale-[1.03]"
                  : "border-transparent hover:scale-105")
              }
              style={{ background: p.color }}
            >
              {active && (
                <Check
                  size={18}
                  strokeWidth={3}
                  className="text-white drop-shadow-sm"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setCustomOpen((s) => !s)}
        className="text-sm font-semibold text-brand-800 underline underline-offset-4 hover:text-brand-900"
      >
        {customOpen ? "Απόκρυψη custom" : "Άλλο χρώμα..."}
      </button>

      {customOpen && (
        <div className="flex items-center gap-3 rounded-xl border-2 border-ink-300 bg-white p-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Επιλογή custom χρώματος"
            className="h-10 w-12 cursor-pointer rounded-md border border-ink-300"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
            }}
            maxLength={7}
            placeholder="#000000"
            className="h-10 w-28 rounded-md border border-ink-300 px-2 font-mono text-sm uppercase focus:border-brand-800 focus:outline-none"
          />
          <span className="text-xs text-ink-500">Δώσε hex ή διάλεξε</span>
        </div>
      )}
    </div>
  );
}
