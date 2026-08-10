/**
 * Athens-timezone date helpers.
 *
 * `new Date().toISOString().slice(0, 10)` gives today in UTC, which is
 * off-by-one for any user in Europe/Athens (UTC+2 or UTC+3 during DST)
 * between local midnight and 02:00-03:00 UTC. On production traffic
 * that lands ~1-2% of drafts on yesterday's date without any warning.
 *
 * All timologion doc drafts are Greek-tenanted, so the "correct today"
 * is always Athens local time. These helpers wrap Intl.DateTimeFormat
 * with Europe/Athens so callers never touch timezone math directly.
 *
 * Safe to call from both server (Node) and client (browser); Intl is
 * available in both.
 */

const ATHENS_TZ = "Europe/Athens";

/**
 * Today in Athens, as an `YYYY-MM-DD` string suitable for a
 * `<input type="date">` value or a `Date(...)` constructor. Uses en-CA
 * because that locale's short-date format is ISO-shaped by design.
 */
export function todayInAthens(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ATHENS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * "Now" in Athens as `YYYY-MM-DDTHH:MM` — the exact shape
 * `<input type="datetime-local">` expects. Used to prefill the dispatch
 * time on new delivery notes (9.3) so the field isn't blank at page load.
 */
export function nowInAthensDateTimeLocal(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ATHENS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
