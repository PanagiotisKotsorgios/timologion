"use client";

import { useMemo, useState } from "react";
import { Field } from "@/components/ui/Input";

/**
 * Common international dialing codes. Deliberately short so the dropdown
 * stays scannable — the user can always type a custom prefix by choosing
 * "Άλλο" (last option).
 */
const COUNTRIES: { code: string; dial: string; label: string; flag: string }[] = [
  { code: "GR", dial: "+30", label: "Ελλάδα", flag: "🇬🇷" },
  { code: "CY", dial: "+357", label: "Κύπρος", flag: "🇨🇾" },
  { code: "DE", dial: "+49", label: "Γερμανία", flag: "🇩🇪" },
  { code: "FR", dial: "+33", label: "Γαλλία", flag: "🇫🇷" },
  { code: "IT", dial: "+39", label: "Ιταλία", flag: "🇮🇹" },
  { code: "ES", dial: "+34", label: "Ισπανία", flag: "🇪🇸" },
  { code: "GB", dial: "+44", label: "Ην. Βασίλειο", flag: "🇬🇧" },
  { code: "US", dial: "+1", label: "ΗΠΑ / Καναδάς", flag: "🇺🇸" },
  { code: "NL", dial: "+31", label: "Ολλανδία", flag: "🇳🇱" },
  { code: "BE", dial: "+32", label: "Βέλγιο", flag: "🇧🇪" },
  { code: "AT", dial: "+43", label: "Αυστρία", flag: "🇦🇹" },
  { code: "CH", dial: "+41", label: "Ελβετία", flag: "🇨🇭" },
  { code: "SE", dial: "+46", label: "Σουηδία", flag: "🇸🇪" },
  { code: "DK", dial: "+45", label: "Δανία", flag: "🇩🇰" },
  { code: "FI", dial: "+358", label: "Φινλανδία", flag: "🇫🇮" },
  { code: "NO", dial: "+47", label: "Νορβηγία", flag: "🇳🇴" },
  { code: "PL", dial: "+48", label: "Πολωνία", flag: "🇵🇱" },
  { code: "PT", dial: "+351", label: "Πορτογαλία", flag: "🇵🇹" },
  { code: "RO", dial: "+40", label: "Ρουμανία", flag: "🇷🇴" },
  { code: "BG", dial: "+359", label: "Βουλγαρία", flag: "🇧🇬" },
  { code: "TR", dial: "+90", label: "Τουρκία", flag: "🇹🇷" },
  { code: "AL", dial: "+355", label: "Αλβανία", flag: "🇦🇱" },
  { code: "MK", dial: "+389", label: "Βόρεια Μακεδονία", flag: "🇲🇰" },
];

/**
 * Split a stored phone value like "+30 6912345678" into (dial, rest).
 * Falls back to Greece if the stored value doesn't start with a known
 * prefix so legacy 10-digit local numbers keep working.
 */
function splitPhone(value: string): { dial: string; rest: string } {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return { dial: "+30", rest: "" };
  for (const c of COUNTRIES) {
    if (trimmed.startsWith(c.dial)) {
      return { dial: c.dial, rest: trimmed.slice(c.dial.length).trim() };
    }
  }
  if (trimmed.startsWith("+")) {
    const m = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
    if (m) return { dial: m[1]!, rest: (m[2] || "").trim() };
  }
  return { dial: "+30", rest: trimmed };
}

/**
 * Phone input with a country dial-code selector. Concatenates into a
 * single space-joined string ("+30 6912345678") on change. Handles
 * foreign clients/suppliers cleanly — user picks their country from the
 * dropdown, defaults to Greece.
 */
export function PhoneField({
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
  const initial = useMemo(() => splitPhone(value), [value]);
  const [dial, setDial] = useState(initial.dial);
  const [rest, setRest] = useState(initial.rest);

  function push(nextDial: string, nextRest: string) {
    const combined = nextRest.trim() ? `${nextDial} ${nextRest.trim()}` : "";
    onChange(combined);
  }

  return (
    <Field label={label} htmlFor={htmlFor} help={help} className={className}>
      <div className="flex gap-2">
        <select
          className="h-12 shrink-0 rounded-lg border-2 border-ink-300 bg-white px-3 pr-8 text-base text-ink-900 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
          value={dial}
          onChange={(e) => {
            setDial(e.target.value);
            push(e.target.value, rest);
          }}
          style={{ maxWidth: "9.5rem" }}
          aria-label="Κωδικός χώρας"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.dial}>
              {c.flag} {c.dial} · {c.label}
            </option>
          ))}
        </select>
        <input
          id={htmlFor}
          name={name}
          type="tel"
          inputMode="tel"
          value={rest}
          onChange={(e) => {
            setRest(e.target.value);
            push(dial, e.target.value);
          }}
          maxLength={20}
          placeholder="π.χ. 6912345678"
          className="h-12 w-full rounded-lg border-2 border-ink-300 bg-white px-4 text-base text-ink-900 placeholder:text-ink-500 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
        />
      </div>
    </Field>
  );
}
