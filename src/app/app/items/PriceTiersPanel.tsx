"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Tag } from "lucide-react";
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
  const [newTier, setNewTier] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTx] = useTransition();

  function addTier() {
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
      setNewTier("");
      setNewPrice("");
      router.refresh();
    });
  }

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

      <div className="grid grid-cols-1 gap-3 border-t border-ink-200 pt-4 md:grid-cols-[1fr_1fr_auto]">
        <Field label="Νέα ζώνη" htmlFor="new-tier">
          <Input
            id="new-tier"
            value={newTier}
            onChange={(e) => setNewTier(e.target.value)}
            placeholder="π.χ. Χονδρική, VIP"
            maxLength={40}
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
          />
        </Field>
        <div className="self-end">
          <Field label=" " htmlFor="add-tier">
            <Button
              type="button"
              onClick={addTier}
              icon={Plus}
              disabled={pending || !newTier.trim() || !newPrice}
            >
              Προσθήκη
            </Button>
          </Field>
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
