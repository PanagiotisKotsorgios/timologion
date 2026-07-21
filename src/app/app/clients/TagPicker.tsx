"use client";

import { useState, useTransition } from "react";
import { Plus, X, Tag as TagIcon } from "lucide-react";
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
  const [newLabel, setNewLabel] = useState("");
  const [color, setColor] = useState("#0B1B3A");
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

  function createNew() {
    if (!newLabel.trim()) return;
    setError(null);
    const fd = new FormData();
    fd.set("label", newLabel.trim());
    fd.set("color", color);
    startTx(async () => {
      const res = await createTagAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const label = newLabel.trim();
      setTags((prev) =>
        prev.some((t) => t.id === res.id)
          ? prev
          : [...prev, { id: res.id, label, color }],
      );
      const nextSel = new Set(selected).add(res.id);
      setSelected(nextSel);
      setNewLabel("");
      const saveRes = await setClientTagsAction(clientId, [...nextSel]);
      if (!saveRes.ok) setError(saveRes.error);
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md bg-red-50 p-2 text-sm text-red-800">{error}</p>
      )}

      {tags.length === 0 && selected.size === 0 && (
        <p className="text-sm text-ink-500">
          Δεν έχεις ετικέτες ακόμη — δημιούργησε παρακάτω.
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

      <div className="flex items-end gap-2 border-t border-ink-200 pt-4">
        <div className="flex-1">
          <label className="text-xs font-semibold uppercase tracking-widest text-ink-500">
            Νέα ετικέτα
          </label>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="π.χ. VIP, Χονδρική"
            maxLength={60}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createNew();
              }
            }}
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-ink-500">
            Χρώμα
          </label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-12 w-14 cursor-pointer rounded-lg border-2 border-ink-300"
          />
        </div>
        <Button
          type="button"
          onClick={createNew}
          icon={Plus}
          disabled={pending || !newLabel.trim()}
        >
          Προσθήκη
        </Button>
      </div>
    </div>
  );
}
