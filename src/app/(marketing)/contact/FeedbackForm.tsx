"use client";

import { useActionState, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBug,
  faLightbulb,
  faMessage,
  faCircleCheck,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import {
  submitFeedbackAction,
  type FeedbackState,
} from "./feedback-actions";
import { FEEDBACK_CATEGORIES } from "./feedback-config";

const TYPES: {
  value: "bug" | "feature" | "other";
  label: string;
  icon: IconDefinition;
  hint: string;
}[] = [
  {
    value: "bug",
    label: "Πρόβλημα",
    icon: faBug,
    hint: "Κάτι δεν δουλεύει όπως θα έπρεπε.",
  },
  {
    value: "feature",
    label: "Νέο χαρακτηριστικό",
    icon: faLightbulb,
    hint: "Πρόταση για κάτι που λείπει.",
  },
  {
    value: "other",
    label: "Άλλο",
    icon: faMessage,
    hint: "Γενικό σχόλιο ή ερώτηση.",
  },
];

const SEVERITIES: {
  value: "low" | "medium" | "high" | "blocker";
  label: string;
  hint: string;
}[] = [
  { value: "low", label: "Χαμηλή", hint: "Ενοχλητικό, όχι επείγον" },
  { value: "medium", label: "Μεσαία", hint: "Επηρεάζει τη ροή εργασίας" },
  {
    value: "high",
    label: "Υψηλή",
    hint: "Επηρεάζει σοβαρά την καθημερινότητα",
  },
  {
    value: "blocker",
    label: "Blocker",
    hint: "Δεν μπορώ να συνεχίσω τη δουλειά μου",
  },
];

/**
 * Dedicated bug / feature report form. Type selector swaps the
 * secondary fields — bugs get a "βήματα αναπαραγωγής" textarea and a
 * severity picker, features get a "priority for you" question, "other"
 * strips both down to a simple message flow. Everything else stays the
 * same so the submitter isn't retyping name/email between switches.
 */
export function FeedbackForm({
  defaultEmail,
  defaultName,
  defaultBusiness,
}: {
  defaultEmail?: string;
  defaultName?: string;
  defaultBusiness?: string;
}) {
  const [state, formAction, pending] = useActionState<FeedbackState, FormData>(
    submitFeedbackAction,
    undefined,
  );
  const [type, setType] = useState<"bug" | "feature" | "other">("bug");
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  // If the server returns success we let the form's uncontrolled inputs
  // stay filled — some users iterate on multiple bugs and appreciate the
  // last submission being visible for reference until they navigate away.

  return (
    <form action={formAction} className="space-y-8">
      {state?.error && (
        <div className="rounded-2xl border-2 border-red-500/30 bg-red-50 p-5 text-base font-medium text-red-700">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-50 p-5 text-base font-medium text-emerald-900">
          <p className="flex items-center gap-2 font-bold">
            <FontAwesomeIcon
              icon={faCircleCheck}
              className="text-emerald-600"
              aria-hidden
            />
            Στάλθηκε
          </p>
          <p className="mt-1">{state.success}</p>
          {state.id && (
            <p className="mt-2 text-xs text-emerald-800/70">
              Αναφορά #{state.id.slice(0, 12)}
            </p>
          )}
        </div>
      )}

      <input type="hidden" name="pageUrl" value={pageUrl} />

      <fieldset>
        <legend className="mb-3 text-base font-semibold text-black">
          Τύπος
        </legend>
        <div className="grid gap-3 md:grid-cols-3">
          {TYPES.map((t) => {
            const active = type === t.value;
            return (
              <label
                key={t.value}
                className={
                  "cursor-pointer rounded-2xl border-2 p-5 transition-all " +
                  (active
                    ? "border-brand-900 bg-brand-50 shadow-inner"
                    : "border-black/10 hover:border-brand-900/40")
                }
              >
                <input
                  type="radio"
                  name="type"
                  value={t.value}
                  className="sr-only"
                  checked={active}
                  onChange={() => setType(t.value)}
                />
                <span
                  className={
                    "inline-grid h-11 w-11 place-items-center rounded-xl transition-colors " +
                    (active
                      ? "bg-brand-900 text-white"
                      : "bg-brand-900/5 text-brand-900")
                  }
                >
                  <FontAwesomeIcon
                    icon={t.icon}
                    className="text-xl"
                    aria-hidden
                  />
                </span>
                <p className="mt-3 text-lg font-extrabold text-brand-900">
                  {t.label}
                </p>
                <p className="mt-1 text-sm text-black/60">{t.hint}</p>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-6 md:grid-cols-2">
        <FormField label="Κατηγορία" htmlFor="category">
          <select
            id="category"
            name="category"
            required
            defaultValue=""
            className="big-input"
          >
            <option value="" disabled>
              — Επίλεξε —
            </option>
            {FEEDBACK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FormField>

        {type === "bug" ? (
          <FormField label="Σοβαρότητα" htmlFor="severity">
            <select
              id="severity"
              name="severity"
              defaultValue="medium"
              className="big-input"
            >
              {SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} — {s.hint}
                </option>
              ))}
            </select>
          </FormField>
        ) : (
          <input type="hidden" name="severity" value="medium" />
        )}
      </div>

      <FormField label="Τίτλος" htmlFor="title" hint="Σύντομος τίτλος">
        <input
          id="title"
          name="title"
          type="text"
          required
          minLength={4}
          maxLength={200}
          placeholder={
            type === "bug"
              ? "π.χ. Δεν φορτώνει το PDF παραστατικού μετά την έκδοση"
              : type === "feature"
                ? "π.χ. Εξαγωγή ραντεβού σε iCal"
                : "π.χ. Ερώτηση για τη συνδρομή"
          }
          className="big-input"
        />
      </FormField>

      <FormField
        label={type === "bug" ? "Τι συμβαίνει;" : "Περιγραφή"}
        htmlFor="description"
        hint="Όσο πιο συγκεκριμένα, τόσο καλύτερα"
      >
        <textarea
          id="description"
          name="description"
          rows={5}
          required
          minLength={20}
          maxLength={6000}
          placeholder={
            type === "bug"
              ? "Πες μας τι περίμενες να συμβεί και τι έγινε αντί για αυτό. Επικόλλησε μηνύματα σφαλμάτων αν υπάρχουν."
              : type === "feature"
                ? "Ποιο πρόβλημα θα λύσει αυτό; Πώς το κάνεις σήμερα και τι δυσκολεύει;"
                : "Γράψε ό,τι θέλεις να μας πεις."
          }
          className="big-textarea"
        />
      </FormField>

      {type === "bug" && (
        <FormField
          label="Βήματα αναπαραγωγής"
          htmlFor="reproSteps"
          hint="Προαιρετικά αλλά πολύ βοηθητικά"
        >
          <textarea
            id="reproSteps"
            name="reproSteps"
            rows={4}
            maxLength={4000}
            placeholder={
              "1. Πάω στα Παραστατικά\n2. Πατάω «Νέο»\n3. Συμπληρώνω κ.λπ.\n4. Πατάω «Έκδοση»\n5. Βλέπω..."
            }
            className="big-textarea"
          />
        </FormField>
      )}

      <div className="border-t-2 border-black/10 pt-8">
        <p className="mb-4 text-sm font-black uppercase tracking-widest text-black/60">
          Στοιχεία επικοινωνίας
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <FormField label="Ονοματεπώνυμο" htmlFor="submitterName">
            <input
              id="submitterName"
              name="submitterName"
              type="text"
              required
              defaultValue={defaultName ?? ""}
              maxLength={120}
              placeholder="Το πλήρες όνομά σου"
              className="big-input"
            />
          </FormField>
          <FormField label="Email" htmlFor="submitterEmail">
            <input
              id="submitterEmail"
              name="submitterEmail"
              type="email"
              required
              defaultValue={defaultEmail ?? ""}
              maxLength={160}
              placeholder="you@example.gr"
              className="big-input"
            />
          </FormField>
          <FormField
            label="Επιχείρηση"
            htmlFor="businessName"
            hint="Προαιρετικά"
            className="md:col-span-2"
          >
            <input
              id="businessName"
              name="businessName"
              type="text"
              defaultValue={defaultBusiness ?? ""}
              maxLength={160}
              placeholder="Η επωνυμία της επιχείρησής σου"
              className="big-input"
            />
          </FormField>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-16 items-center rounded-full bg-brand-900 px-10 text-lg font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {pending ? "Αποστολή..." : "Στείλε αναφορά"}
      </button>
      <p className="text-sm text-black/50">
        Οι αναφορές αποθηκεύονται στο σύστημα υποστήριξης και προωθούνται
        στην ομάδα ανάπτυξης. Θα λάβεις επιβεβαίωση από το{" "}
        <strong>support@timologion.gr</strong>.
      </p>
    </form>
  );
}

function FormField({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-3 flex items-baseline justify-between">
        <label
          htmlFor={htmlFor}
          className="text-base font-semibold text-black"
        >
          {label}
        </label>
        {hint && <span className="text-sm text-black/50">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
