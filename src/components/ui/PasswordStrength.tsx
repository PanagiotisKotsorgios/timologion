"use client";

import { useMemo } from "react";

type Level = 0 | 1 | 2 | 3 | 4;

type Result = {
  score: Level;
  label: string;
  color: string;
  hints: string[];
};

/**
 * Zero-dependency password heuristic. Not zxcvbn-grade, but good enough to
 * nudge users away from short/obvious inputs without shipping a 400KB library.
 */
export function scorePassword(pw: string): Result {
  const hints: string[] = [];
  let score = 0;

  if (pw.length >= 8) score += 1;
  else hints.push("Τουλάχιστον 8 χαρακτήρες");

  if (pw.length >= 12) score += 1;
  else if (pw.length >= 8) hints.push("Καλύτερα 12+ χαρακτήρες");

  const hasLower = /[a-zα-ω]/.test(pw);
  const hasUpper = /[A-ZΑ-Ω]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSymbol = /[^\w\sα-ωΑ-Ω]/.test(pw);

  const classes = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  if (classes >= 2) score += 1;
  if (classes >= 3) score += 1;
  if (classes === 4) score += 1;

  if (!hasDigit) hints.push("Πρόσθεσε έναν αριθμό");
  if (!hasSymbol) hints.push("Πρόσθεσε ένα σύμβολο (π.χ. !, ?, #)");
  if (!(hasLower && hasUpper))
    hints.push("Χρησιμοποίησε πεζά και κεφαλαία");

  // Penalise obvious sequences.
  const common =
    /(password|123456|qwerty|abcdef|admin|welcome|timologion)/i.test(pw);
  if (common) {
    score = Math.max(0, score - 2);
    hints.push("Απόφυγε προφανή μοτίβα");
  }

  const clamped = Math.min(4, Math.max(0, score)) as Level;

  const labels = ["Πολύ αδύναμος", "Αδύναμος", "Μέτριος", "Ισχυρός", "Πολύ ισχυρός"];
  const colors = ["#dc2626", "#f97316", "#eab308", "#16a34a", "#059669"];

  return {
    score: clamped,
    label: labels[clamped]!,
    color: colors[clamped]!,
    hints: hints.slice(0, 3),
  };
}

export function PasswordStrength({ value }: { value: string }) {
  const result = useMemo(() => scorePassword(value), [value]);

  if (!value) return null;

  const pct = ((result.score + 1) / 5) * 100;

  return (
    <div className="mt-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.08]">
        <div
          className="h-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: result.color,
          }}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <span
          className="font-semibold"
          style={{ color: result.color }}
        >
          {result.label}
        </span>
        {result.hints.length > 0 && (
          <span className="text-black/60">
            {result.hints.join(" · ")}
          </span>
        )}
      </div>
    </div>
  );
}
