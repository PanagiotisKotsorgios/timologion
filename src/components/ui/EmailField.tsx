"use client";

import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { Field, Input } from "@/components/ui/Input";

/**
 * Email input with a persistent warning when the user types Greek (or
 * any non-Latin) characters. Email addresses that are technically valid
 * in IDN are still rejected by many SMTP relays — the safest thing is
 * to nudge the user to use Latin only.
 */
export function EmailField({
  label = "Email",
  htmlFor,
  name,
  value,
  onChange,
  help,
  className,
  required,
}: {
  label?: string;
  htmlFor: string;
  name?: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
  className?: string;
  required?: boolean;
}) {
  const hasNonLatin = useMemo(
    () => /[^\x20-\x7E]/.test(value),
    [value],
  );
  return (
    <Field label={label} htmlFor={htmlFor} help={help} className={className} required={required}>
      <Input
        id={htmlFor}
        name={name}
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={160}
        placeholder="π.χ. info@example.com"
        required={required}
      />
      {hasNonLatin ? (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
          <AlertCircle size={13} strokeWidth={2.5} aria-hidden />
          Το email δέχεται μόνο λατινικούς χαρακτήρες (a-z, 0-9,
          σύμβολα). Αφαίρεσε τους ελληνικούς.
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-ink-500">
          Λατινικοί χαρακτήρες μόνο.
        </p>
      )}
    </Field>
  );
}
