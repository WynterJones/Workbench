import { describe, expect, it } from "vitest";

function progressOf(scrollTop: number, scrollHeight: number, clientHeight: number): number {
  const max = scrollHeight - clientHeight;
  return max <= 0 ? 1 : Math.min(1, Math.max(0, scrollTop / max));
}

function advance(carry: number, pixelsPerSecond: number, speed: number, dt: number) {
  const next = carry + pixelsPerSecond * speed * dt;
  const whole = Math.floor(next);
  return { scrollBy: Math.max(0, whole), carry: next - Math.max(0, whole) };
}

describe("auto scroll progress", () => {
  it("is 1 when there is nothing to scroll", () => {
    expect(progressOf(0, 500, 500)).toBe(1);
    expect(progressOf(0, 100, 500)).toBe(1);
  });

  it("maps scroll position onto 0..1", () => {
    expect(progressOf(0, 1500, 500)).toBe(0);
    expect(progressOf(500, 1500, 500)).toBe(0.5);
    expect(progressOf(1000, 1500, 500)).toBe(1);
  });

  it("never exceeds its bounds", () => {
    expect(progressOf(99999, 1500, 500)).toBe(1);
    expect(progressOf(-50, 1500, 500)).toBe(0);
  });
});

describe("sub-pixel carry", () => {
  it("accumulates fractional pixels instead of dropping them", () => {
    let carry = 0;
    let scrolled = 0;
    for (let i = 0; i < 60; i += 1) {
      const step = advance(carry, 90, 1, 1 / 60);
      carry = step.carry;
      scrolled += step.scrollBy;
    }
    expect(scrolled).toBeGreaterThanOrEqual(89);
    expect(scrolled).toBeLessThanOrEqual(90);
  });

  it("scales with speed", () => {
    const slow = advance(0, 90, 1, 1);
    const fast = advance(0, 90, 4, 1);
    expect(fast.scrollBy).toBe(slow.scrollBy * 4);
  });

  it("never scrolls backwards", () => {
    expect(advance(0, 90, 1, 0).scrollBy).toBe(0);
  });
});
