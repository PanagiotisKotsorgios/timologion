import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

type FieldProps = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
  htmlFor?: string;
};

export function Field({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
}: FieldProps) {
  return (
    <div className={clsx("space-y-2", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-semibold text-ink-900"
        >
          {label}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-sm text-ink-700">{hint}</p>
      )}
      {error && <p className="text-sm font-medium text-red-700">{error}</p>}
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
  return (
    <input
      ref={ref}
      className={clsx(FIELD_BASE, "h-12", className)}
      {...rest}
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
