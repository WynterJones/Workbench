import { describe, expect, it } from "vitest";
import { revealStyle } from "@/features/timeline/revealStyle";

describe("revealStyle", () => {
  it("shows everything already revealed at full opacity", () => {
    expect(revealStyle(0, 5)).toEqual({ opacity: 1, translateY: 0, interactive: true });
    expect(revealStyle(4, 5).opacity).toBe(1);
  });

  it("fades the next few rows in a descending trail", () => {
    const a = revealStyle(5, 5).opacity;
    const b = revealStyle(6, 5).opacity;
    const c = revealStyle(7, 5).opacity;
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
    expect(c).toBeGreaterThan(0);
  });

  it("hides anything beyond the lookahead", () => {
    expect(revealStyle(8, 5).opacity).toBe(0);
    expect(revealStyle(500, 5).opacity).toBe(0);
  });

  it("only lets revealed rows take clicks", () => {
    expect(revealStyle(4, 5).interactive).toBe(true);
    expect(revealStyle(5, 5).interactive).toBe(false);
    expect(revealStyle(9, 5).interactive).toBe(false);
  });

  it("lifts upcoming rows progressively so they settle rather than snap", () => {
    expect(revealStyle(5, 5).translateY).toBeLessThan(revealStyle(7, 5).translateY);
    expect(revealStyle(4, 5).translateY).toBe(0);
  });
});
