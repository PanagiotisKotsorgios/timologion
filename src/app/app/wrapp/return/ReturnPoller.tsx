"use client";

import { useEffect, useRef, useState } from "react";
import { checkActivationAction } from "../../activation-actions";

/**
 * Silent poller for the Wrapp return page.
 *
 * Every 3 seconds we ask the server whether the connection has flipped
 * to `active`. When it does, we do a full-page reload — the parent server
 * component will re-render, see `active`, and redirect() the user to /app.
 *
 * Gives up after ~2 minutes to avoid a runaway loop if the webhook never
 * fires. Shows an animated pulsing dot so the user knows something is
 * happening.
 */
export function ReturnPoller() {
  const [ticks, setTicks] = useState(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    const max = 40; // ~2 min at 3s intervals
    const interval = window.setInterval(async () => {
      if (stoppedRef.current) return;
      setTicks((t) => t + 1);
      try {
        const res = await checkActivationAction();
        if (res.active) {
          stoppedRef.current = true;
          window.location.reload();
        }
      } catch {
        // Silent — never surface polling failures.
      }
    }, 3000);
    // Auto-stop after ~2 min so we don't poll forever.
    const stop = window.setTimeout(() => {
      stoppedRef.current = true;
      window.clearInterval(interval);
    }, max * 3000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, []);

  return (
    <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-xs font-bold text-amber-900">
      <span
        aria-hidden
        className="h-2 w-2 animate-pulse rounded-full bg-amber-700"
      />
      Αναμονή αυτόματης ενημέρωσης
      {ticks > 0 && <span className="text-amber-800/70">· {ticks * 3}s</span>}
    </div>
  );
}
