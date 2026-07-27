"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, ShieldAlert } from "lucide-react";
import { logoutAction } from "@/app/(auth)/login/actions";

/**
 * Auto-logout on inactivity. Renders a countdown pill in the topbar.
 *
 * Behaviour:
 *   - Any user interaction (click, keydown, scroll, touch, focus) resets
 *     the timer to `timeoutMinutes`. Mousemove is throttled to once per
 *     30s so idle chart hover doesn't count as activity.
 *   - When the remaining time drops below 60 seconds the pill turns
 *     red and a modal warning appears with a "Παρέμεινε συνδεδεμένος"
 *     button that resets the timer manually.
 *   - When the countdown hits 0, we call the logout server action which
 *     destroys the session cookie and redirects to /login.
 *
 * The initial `timeoutMinutes` comes from the user's saved preference on
 * `User.sessionTimeoutMinutes`. Server broadcasts changes via router
 * refresh; the client picks up the new value on the next mount.
 */
const WARN_SECONDS = 60;
const MOUSEMOVE_THROTTLE_MS = 30_000;
const TICK_MS = 1_000;

function pad(n: number) {
  return n < 10 ? "0" + n : String(n);
}

function formatRemaining(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(r)}`;
  return `${m}:${pad(r)}`;
}

export function InactivityWatchdog({
  timeoutMinutes,
}: {
  timeoutMinutes: number;
}) {
  const capped = Math.min(480, Math.max(5, timeoutMinutes || 60));
  const totalSec = capped * 60;

  const [remaining, setRemaining] = useState(totalSec);
  const [warning, setWarning] = useState(false);
  const lastMoveResetRef = useRef<number>(0);
  const loggingOutRef = useRef(false);

  // Reset countdown on any user activity.
  useEffect(() => {
    function bump() {
      setRemaining(totalSec);
    }
    function bumpThrottled() {
      const now = Date.now();
      if (now - lastMoveResetRef.current < MOUSEMOVE_THROTTLE_MS) return;
      lastMoveResetRef.current = now;
      bump();
    }
    const clickEvents: (keyof WindowEventMap)[] = [
      "click",
      "keydown",
      "touchstart",
      "focusin",
      "scroll",
    ];
    for (const e of clickEvents) window.addEventListener(e, bump, { passive: true });
    window.addEventListener("mousemove", bumpThrottled, { passive: true });
    return () => {
      for (const e of clickEvents) window.removeEventListener(e, bump);
      window.removeEventListener("mousemove", bumpThrottled);
    };
  }, [totalSec]);

  // Countdown tick.
  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Toggle the warning modal below 60s.
  useEffect(() => {
    setWarning(remaining > 0 && remaining <= WARN_SECONDS);
  }, [remaining]);

  // Fire logout when it hits 0.
  useEffect(() => {
    if (remaining > 0 || loggingOutRef.current) return;
    loggingOutRef.current = true;
    // Server action handles cookie clear + redirect. Wrapping in a
    // form-less call keeps this tidy — logoutAction is a "use server"
    // function so calling it directly from a client component is fine.
    logoutAction().catch(() => {
      // If the network's dead we fall back to a hard redirect so the
      // user still sees the login screen.
      window.location.href = "/login";
    });
  }, [remaining]);

  const isCritical = remaining <= WARN_SECONDS;
  const label = formatRemaining(remaining);

  function stayConnected() {
    setRemaining(totalSec);
    setWarning(false);
  }

  return (
    <>
      <div
        title={
          isCritical
            ? "Πρόκειται να αποσυνδεθείς λόγω αδράνειας. Κάνε κλικ οπουδήποτε για να παραμείνεις συνδεδεμένος."
            : `Αυτόματη αποσύνδεση μετά από ${capped} λεπτά αδράνειας. Ο μετρητής μηδενίζεται σε κάθε δραστηριότητα.`
        }
        aria-live="polite"
        className={
          "hidden select-none items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-bold tabular-nums transition-colors md:inline-flex " +
          (isCritical
            ? "border-red-500 bg-red-50 text-red-700 animate-pulse"
            : "border-ink-300 bg-ink-50 text-ink-900")
        }
      >
        <Clock size={14} aria-hidden />
        <span>{label}</span>
      </div>

      {warning && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="inactivity-warn-title"
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-3xl border border-ink-300/70 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-100 text-red-700">
                <ShieldAlert size={22} aria-hidden />
              </div>
              <div>
                <h2
                  id="inactivity-warn-title"
                  className="text-xl font-extrabold text-brand-900 md:text-2xl"
                >
                  Πρόκειται να αποσυνδεθείς
                </h2>
                <p className="mt-2 text-sm text-ink-700">
                  Δεν εντοπίσαμε δραστηριότητα εδώ και ώρα. Θα
                  αποσυνδεθείς αυτόματα σε{" "}
                  <span className="font-bold text-red-700">
                    {remaining} δευτ.
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={stayConnected}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-900 px-5 text-sm font-bold text-white hover:bg-black"
              >
                Παρέμεινε συνδεδεμένος
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
