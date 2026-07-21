"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

/**
 * Password input with a show/hide toggle. Uses the same `.big-input` treatment
 * as the login card but leaves room on the right for the toggle button.
 */
type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "className"
> & {
  className?: string;
};

export function PasswordField({ className, ...rest }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={clsx("relative", className)}>
      <input
        {...rest}
        type={visible ? "text" : "password"}
        className="big-input pr-14"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"}
        aria-pressed={visible}
        className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-black/60 transition-colors hover:bg-black/[0.05] hover:text-black"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
