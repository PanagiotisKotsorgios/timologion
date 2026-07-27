"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import {
  saveItemPriceTierAction,
  deleteItemPriceTierAction,
} from "./actions";

type Tier = { tier: string; price: string };

export function PriceTiersPanel({
  itemId,
  initial,
}: {
  itemId: string;
  initial: Tier[];
}) {
  const router = useRouter();
  const [rows] = useState<Tier[]>(initial);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTx] = useTransition();

  function updateTier(tier: string, price: string) {
    setError(null);
    const fd = new FormData();
    fd.set("itemId", itemId);
    fd.set("tier", tier);
    fd.set("price", price);
    startTx(async () => {
      const res = await saveItemPriceTierAction(fd);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  function removeTier(tier: string) {
    const fd = new FormData();
    fd.set("itemId", itemId);
    fd.set("tier", tier);
    startTx(async () => {
      await deleteItemPriceTierAction(fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md bg-red-50 p-2 text-sm text-red-800">{error}</p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-ink-500">
          Δεν έχουν οριστεί ζώνες τιμών ακόμη.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <TierRow
              key={r.tier}
              tier={r.tier}
              initialPrice={r.price}
              onSave={(price) => updateTier(r.tier, price)}
              onDelete={() => removeTier(r.tier)}
              disabled={pending}
            />
          ))}
        </div>
      )}

      <div className="pt-2">
        <Button
          type="button"
          onClick={() => setShowNew(true)}
          icon={Plus}
          variant="secondary"
        >
          Νέα ζώνη τιμών
        </Button>
      </div>

      {showNew && (
        <NewTierModal
          itemId={itemId}
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function NewTierModal({
  itemId,
  onClose,
  onSaved,
}: {
  itemId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [newTier, setNewTier] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTx] = useTransition();

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
    if (!newTier.trim() || !newPrice) return;
    setError(null);
    const fd = new FormData();
    fd.set("itemId", itemId);
    fd.set("tier", newTier.trim());
    fd.set("price", newPrice);
    startTx(async () => {
      const res = await saveItemPriceTierAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-tier-title"
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
              <Tag size={22} aria-hidden />
            </div>
            <div>
              <h2
                id="new-tier-title"
                className="text-2xl font-extrabold text-brand-900 md:text-3xl"
              >
                Νέα ζώνη τιμών
              </h2>
              <p className="mt-1 text-sm text-ink-700">
                Ορίστε μια διαφορετική τιμή για συγκεκριμένη ομάδα πελατών.
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
          <Field label="Όνομα ζώνης" htmlFor="new-tier">
            <Input
              id="new-tier"
              value={newTier}
              onChange={(e) => setNewTier(e.target.value)}
              placeholder="π.χ. Χονδρική, VIP"
              maxLength={40}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          </Field>
          <Field label="Τιμή" htmlFor="new-price">
            <Input
              id="new-price"
              type="number"
              step="0.01"
              min="0"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          </Field>
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
              disabled={pending || !newTier.trim() || !newPrice}
            >
              {pending ? "Αποθήκευση..." : "Προσθήκη"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TierRow({
  tier,
  initialPrice,
  onSave,
  onDelete,
  disabled,
}: {
  tier: string;
  initialPrice: string;
  onSave: (price: string) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const [price, setPrice] = useState(initialPrice);
  const dirty = price !== initialPrice;
  return (
    <div className="flex items-center gap-2 rounded-lg border-2 border-ink-200 bg-white p-2">
      <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-100 px-3 py-1.5 text-sm font-semibold text-brand-900">
        <Tag size={12} aria-hidden />
        {tier}
      </span>
      <Input
        type="number"
        step="0.01"
        min="0"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="flex-1"
      />
      {dirty && (
        <Button
          type="button"
          size="sm"
          onClick={() => onSave(price)}
          disabled={disabled}
        >
          Αποθήκευση
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        icon={Trash2}
        onClick={onDelete}
        disabled={disabled}
      >
        <span className="sr-only">Διαγραφή</span>
      </Button>
    </div>
  );
}
