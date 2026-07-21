/**
 * Token-bucket rate limiter using an in-memory Map.
 *
 * Sufficient for a single-node deployment; on a multi-node setup swap in Redis
 * or Upstash and keep the same interface. Keys are typically `{action}:{ip}` so
 * the caller controls the granularity.
 */

type Bucket = {
  tokens: number;
  updatedAt: number;
};

const buckets = new Map<string, Bucket>();

// Periodic sweep so stale keys don't grow forever. 1min interval, drop keys
// idle > 30min. Only starts on the first call so tests importing the module
// don't spawn timers unexpectedly.
let sweeper: ReturnType<typeof setInterval> | null = null;
function ensureSweeper() {
  if (sweeper) return;
  sweeper = setInterval(() => {
    const cutoff = Date.now() - 30 * 60 * 1000;
    for (const [k, v] of buckets) {
      if (v.updatedAt < cutoff) buckets.delete(k);
    }
  }, 60 * 1000);
  // Don't hold the event loop open.
  sweeper.unref?.();
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number;
};

/**
 * Consume one token from a bucket.
 *
 * @param key       stable identifier (e.g. `login:${ip}`)
 * @param capacity  max tokens the bucket ever holds
 * @param refillMs  how often (ms) a token is added
 */
export function consume(
  key: string,
  capacity: number,
  refillMs: number,
): RateLimitResult {
  ensureSweeper();
  const now = Date.now();
  const b = buckets.get(key);

  if (!b) {
    buckets.set(key, { tokens: capacity - 1, updatedAt: now });
    return {
      ok: true,
      remaining: capacity - 1,
      resetAt: now + refillMs,
      retryAfter: 0,
    };
  }

  const elapsed = now - b.updatedAt;
  const refill = Math.floor(elapsed / refillMs);
  if (refill > 0) {
    b.tokens = Math.min(capacity, b.tokens + refill);
    b.updatedAt = now;
  }

  if (b.tokens <= 0) {
    const retryAfter = Math.max(1, Math.ceil((refillMs - (now - b.updatedAt)) / 1000));
    return {
      ok: false,
      remaining: 0,
      resetAt: b.updatedAt + refillMs,
      retryAfter,
    };
  }

  b.tokens -= 1;
  return {
    ok: true,
    remaining: b.tokens,
    resetAt: b.updatedAt + refillMs,
    retryAfter: 0,
  };
}

/** Extract a rough client identifier from request headers. */
export function clientIp(req: Request | Headers): string {
  const h = req instanceof Headers ? req : new Headers();
  if (!(req instanceof Headers)) {
    for (const [k, v] of req.headers.entries()) h.set(k, v);
  }
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    h.get("cf-connecting-ip") ??
    "unknown"
  );
}

// Pre-baked limits so callers don't reinvent numbers. Bucket sizes are picked
// to allow occasional bursts (typo re-tries) but shut down credential-stuffing.
export const LIMITS = {
  // 5 attempts / 5 minutes for login
  login: { capacity: 5, refillMs: 60 * 1000 },
  // 3 attempts / 15 minutes for password reset requests — costs email volume.
  forgotPassword: { capacity: 3, refillMs: 5 * 60 * 1000 },
  // 3 registration attempts / 10 minutes per IP
  register: { capacity: 3, refillMs: 3 * 60 * 1000 },
  // 10 OAuth starts / 5 minutes per IP
  oauthStart: { capacity: 10, refillMs: 30 * 1000 },
  // Generic API endpoint bucket.
  api: { capacity: 60, refillMs: 1000 },
} as const;
