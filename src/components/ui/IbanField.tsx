"use client";

import { useMemo, useState } from "react";
import { Field } from "@/components/ui/Input";

/**
 * IBAN country prefixes we routinely see on Greek supplier payouts and
 * cross-border transfers. Length is the total expected IBAN length
 * INCLUDING the 2-letter country prefix + 2-digit check digits.
 */
const IBAN_COUNTRIES: {
  code: string;
  label: string;
  length: number;
  flag: string;
}[] = [
  { code: "GR", label: "Ελλάδα", length: 27, flag: "🇬🇷" },
  { code: "CY", label: "Κύπρος", length: 28, flag: "🇨🇾" },
  { code: "DE", label: "Γερμανία", length: 22, flag: "🇩🇪" },
  { code: "FR", label: "Γαλλία", length: 27, flag: "🇫🇷" },
  { code: "IT", label: "Ιταλία", length: 27, flag: "🇮🇹" },
  { code: "ES", label: "Ισπανία", length: 24, flag: "🇪🇸" },
  { code: "GB", label: "Ην. Βασίλειο", length: 22, flag: "🇬🇧" },
  { code: "NL", label: "Ολλανδία", length: 18, flag: "🇳🇱" },
  { code: "BE", label: "Βέλγιο", length: 16, flag: "🇧🇪" },
  { code: "AT", label: "Αυστρία", length: 20, flag: "🇦🇹" },
  { code: "CH", label: "Ελβετία", length: 21, flag: "🇨🇭" },
  { code: "SE", label: "Σουηδία", length: 24, flag: "🇸🇪" },
  { code: "DK", label: "Δανία", length: 18, flag: "🇩🇰" },
  { code: "FI", label: "Φινλανδία", length: 18, flag: "🇫🇮" },
  { code: "NO", label: "Νορβηγία", length: 15, flag: "🇳🇴" },
  { code: "PL", label: "Πολωνία", length: 28, flag: "🇵🇱" },
  { code: "PT", label: "Πορτογαλία", length: 25, flag: "🇵🇹" },
  { code: "RO", label: "Ρουμανία", length: 24, flag: "🇷🇴" },
  { code: "BG", label: "Βουλγαρία", length: 22, flag: "🇧🇬" },
];

function splitIban(value: string): { country: string; rest: string } {
  const cleaned = (value ?? "").replace(/\s+/g, "").toUpperCase();
  if (!cleaned) return { country: "GR", rest: "" };
  const prefix = cleaned.slice(0, 2);
  const hit = IBAN_COUNTRIES.find((c) => c.code === prefix);
  if (hit) return { country: prefix, rest: cleaned.slice(2) };
  return { country: "GR", rest: cleaned };
}

function pretty(country: string, rest: string): string {
  return (country + rest).replace(/(.{4})/g, "$1 ").trim();
}

/**
 * IBAN input with a country prefix dropdown. Defaults to Greece. Enforces
 * the per-country maximum length so pasting a longer string is trimmed.
 * Combined value is stored space-formatted (GR16 0110 1250 …) for
 * readability in reports and PDF exports.
 */
export function IbanField({
  label,
  htmlFor,
  name,
  value,
  onChange,
  help,
  className,
}: {
  label: string;
  htmlFor: string;
  name?: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
  className?: string;
}) {
  const initial = useMemo(() => splitIban(value), [value]);
  const [country, setCountry] = useState(initial.country);
  const [rest, setRest] = useState(initial.rest);

  const spec = IBAN_COUNTRIES.find((c) => c.code === country);
  const restMax = spec ? spec.length - 2 : 40;
  const currentLen = country.length + rest.length;
  const isComplete = spec ? currentLen === spec.length : rest.length > 8;
  const isTooShort = spec ? currentLen < spec.length : false;

  function push(nextCountry: string, nextRest: string) {
    const nextSpec = IBAN_COUNTRIES.find((c) => c.code === nextCountry);
    const trimmed = nextRest.slice(0, nextSpec ? nextSpec.length - 2 : 40);
    onChange(trimmed ? pretty(nextCountry, trimmed) : "");
  }

  return (
    <Field label={label} htmlFor={htmlFor} help={help} className={className}>
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <select
            className="h-12 shrink-0 rounded-lg border-2 border-ink-300 bg-white px-3 pr-8 text-base text-ink-900 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              push(e.target.value, rest);
            }}
            style={{ maxWidth: "10rem" }}
            aria-label="Χώρα IBAN"
          >
            {IBAN_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} · {c.label}
              </option>
            ))}
          </select>
          <input
            id={htmlFor}
            name={name}
            type="text"
            value={rest}
            onChange={(e) => {
              const cleaned = e.target.value
                .toUpperCase()
                .replace(/[^0-9A-Z]/g, "");
              setRest(cleaned);
              push(country, cleaned);
            }}
            maxLength={restMax}
            placeholder={spec ? `${restMax} χαρακτήρες` : "IBAN"}
            className="mono h-12 w-full rounded-lg border-2 border-ink-300 bg-white px-4 text-base uppercase tracking-widest text-ink-900 placeholder:text-ink-500 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
          />
        </div>
        {spec && (
          <p className="text-xs text-ink-700">
            {isTooShort ? (
              <>
                Απαιτούνται{" "}
                <strong>
                  {spec.length - currentLen} ακόμα χαρακτήρες
                </strong>{" "}
                για {spec.label} ({spec.length} συνολικά)
              </>
            ) : isComplete ? (
              <span className="text-green-800">
                ✓ Έγκυρο μήκος IBAN για {spec.label}
              </span>
            ) : (
              <>
                Μήκος για {spec.label}: {spec.length} χαρακτήρες
              </>
            )}
          </p>
        )}
      </div>
    </Field>
  );
}
