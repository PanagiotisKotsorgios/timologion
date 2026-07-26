"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";

/**
 * Global toast system. Any client component can call `toast.success("...")`
 * or `toast.error("...")` and get a floating notification in the top-right,
 * auto-dismissing after 4 seconds. Rendered above every other layer at
 * z-[200].
 */

export type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastCtx = {
  push: (kind: ToastKind, message: string) => void;
};

const ToastContext = createContext<ToastCtx | null>(null);

let uid = 0;

/**
 * Provider — mount once at the app-shell root. Renders any pushed toasts
 * in a fixed viewport-anchored stack.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++uid;
    setItems((prev) => [...prev, { id, kind, message }]);
    // Broadcast to any imperative caller waiting for a slot.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app:toast-shown", { detail: { id } }));
    }
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Listen for imperative pushes from non-React code / anywhere.
  useEffect(() => {
    function onPush(e: Event) {
      const detail = (e as CustomEvent<{ kind: ToastKind; message: string }>).detail;
      if (detail?.kind && detail?.message) push(detail.kind, detail.message);
    }
    window.addEventListener("app:toast-push", onPush);
    return () => window.removeEventListener("app:toast-push", onPush);
  }, [push]);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4 sm:top-6 sm:items-end sm:pr-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, 4200);
    return () => window.clearTimeout(t);
  }, [onDismiss]);

  const styles =
    item.kind === "success"
      ? { bar: "bg-emerald-600", icon: CheckCircle2, iconColor: "text-emerald-100" }
      : item.kind === "error"
        ? { bar: "bg-red-600", icon: XCircle, iconColor: "text-red-100" }
        : { bar: "bg-brand-900", icon: Info, iconColor: "text-brand-100" };

  const Icon = styles.icon;

  return (
    <div
      role="status"
      className={
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 text-white shadow-2xl animate-in slide-in-from-top-2 fade-in-0 duration-200 " +
        styles.bar
      }
      onClick={onDismiss}
    >
      <Icon
        size={20}
        className={"mt-0.5 shrink-0 " + styles.iconColor}
        aria-hidden
      />
      <p className="flex-1 text-[15px] font-semibold leading-snug">
        {item.message}
      </p>
    </div>
  );
}

/**
 * Preferred access — call inside a client component.
 * Falls back to imperative dispatch if provider isn't mounted (shouldn't
 * happen but keeps callers safe during SSR/CSR handoff).
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  return {
    success: (msg: string) =>
      ctx ? ctx.push("success", msg) : dispatchImperative("success", msg),
    error: (msg: string) =>
      ctx ? ctx.push("error", msg) : dispatchImperative("error", msg),
    info: (msg: string) =>
      ctx ? ctx.push("info", msg) : dispatchImperative("info", msg),
  };
}

function dispatchImperative(kind: ToastKind, message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("app:toast-push", { detail: { kind, message } }),
  );
}

/**
 * Fully imperative access — usable outside React trees (rare — event
 * handlers attached to the DOM manually, etc.). Prefer `useToast()`.
 */
export const toast = {
  success: (msg: string) => dispatchImperative("success", msg),
  error: (msg: string) => dispatchImperative("error", msg),
  info: (msg: string) => dispatchImperative("info", msg),
};
