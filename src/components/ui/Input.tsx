import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";
import { HelpTip } from "./HelpTip";

type FieldProps = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
  /**
   * Optional short help text. When set, a "?" icon appears next to the
   * label and shows the text on hover/focus. Use to explain Greek tax
   * terminology to first-time users (e.g. "ΔΟΥ", "Διακριτικός τίτλος",
   * "μονάδα μέτρησης").
   */
  help?: string;
};

export function Field({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
  required,
  help,
}: FieldProps) {
  return (
    <div className={clsx("space-y-2", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-1.5 text-base font-bold text-ink-900"
        >
          <span>
            {label}
            {required && (
              <span aria-hidden className="ml-1 text-red-600">
                *
              </span>
            )}
          </span>
          {help && <HelpTip text={help} />}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-sm text-ink-700 md:text-[15px]">{hint}</p>
      )}
      {error && (
        <p className="text-sm font-semibold text-red-700 md:text-[15px]">
          {error}
        </p>
      )}
    </div>
  );
}

const FIELD_BASE =
  "w-full rounded-lg border-2 border-ink-300 bg-white px-4 py-3 text-base text-ink-900 placeholder:text-ink-500 " +
  "hover:border-ink-500 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15 " +
  "disabled:bg-ink-100 disabled:text-ink-500 disabled:hover:border-ink-300 " +
  "transition-colors";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  className?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...rest },
  ref,
) {
  // Chrome on Greek-Windows renders the native date placeholder as
  // "ηη/χιλ./εεεε" — it pulls the short-date pattern from Windows and
  // that pattern renders "M" as the localized abbreviation "χιλ.".
  // Pinning lang="el-GR" on date-family inputs forces the browser to use
  // ICU's Greek locale instead, which renders "ηη/μμ/εεεε" as expected.
  const isDateFamily =
    rest.type === "date" ||
    rest.type === "datetime-local" ||
    rest.type === "month" ||
    rest.type === "week";
  const langAttr = isDateFamily && !rest.lang ? "el-GR" : rest.lang;
  return (
    <input
      ref={ref}
      className={clsx(FIELD_BASE, "h-12", className)}
      {...rest}
      lang={langAttr}
    />
  );
});

type TextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className"
> & {
  className?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={clsx(FIELD_BASE, className)}
        {...rest}
      />
    );
  },
);

type SelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "className"
> & {
  className?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={clsx(FIELD_BASE, "h-12 appearance-none pr-10", className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M3 4.5 6 8l3-3.5' fill='none' stroke='%230f172a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
        }}
        {...rest}
      >
        {children}
      </select>
    );
  },
);
