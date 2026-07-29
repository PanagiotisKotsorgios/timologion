"use client";

import { useEffect, useRef, type TextareaHTMLAttributes } from "react";

/**
 * Textarea that grows to fit its content up to `maxRows` (default 6),
 * then scrolls. Used inline in the invoice-lines table so long
 * descriptions display in full instead of getting truncated in a
 * single-line input.
 */
export function AutoTextarea({
  value,
  onChange,
  minRows = 1,
  maxRows = 6,
  className,
  ...rest
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  minRows?: number;
  maxRows?: number;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight || "20") || 20;
    const padding =
      parseFloat(getComputedStyle(el).paddingTop || "0") +
      parseFloat(getComputedStyle(el).paddingBottom || "0");
    const maxH = lineHeight * maxRows + padding;
    const minH = lineHeight * minRows + padding;
    const desired = Math.min(Math.max(el.scrollHeight, minH), maxH);
    el.style.height = `${desired}px`;
    el.style.overflowY = el.scrollHeight > maxH ? "auto" : "hidden";
  }, [value, minRows, maxRows]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      rows={minRows}
      className={className ?? "row-textarea"}
      {...rest}
    />
  );
}
