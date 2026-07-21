import { describe, it, expect } from "vitest";
import { consume } from "./rate-limit";

describe("consume (token bucket)", () => {
  it("permits up to capacity, then blocks", () => {
    const key = `test-basic-${Math.random()}`;
    const cap = 3;
    const refill = 60_000;

    const r1 = consume(key, cap, refill);
    const r2 = consume(key, cap, refill);
    const r3 = consume(key, cap, refill);
    const r4 = consume(key, cap, refill);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(true);
    expect(r4.ok).toBe(false);
    expect(r4.retryAfter).toBeGreaterThan(0);
  });

  it("isolates buckets by key", () => {
    const cap = 1;
    const refill = 60_000;

    const a1 = consume("a-" + Math.random(), cap, refill);
    const b1 = consume("b-" + Math.random(), cap, refill);
    // Different keys, both first consumers, both should succeed.
    expect(a1.ok).toBe(true);
    expect(b1.ok).toBe(true);
  });

  it("returns remaining tokens", () => {
    const key = `test-remaining-${Math.random()}`;
    const r1 = consume(key, 5, 60_000);
    expect(r1.remaining).toBe(4);
    const r2 = consume(key, 5, 60_000);
    expect(r2.remaining).toBe(3);
  });
});
