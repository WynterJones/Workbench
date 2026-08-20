import { describe, expect, it } from "vitest";
import { formatTokens } from "@/lib/formatTokens";

describe("formatTokens", () => {
  it("leaves small counts alone", () => {
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(999)).toBe("999");
  });

  it("abbreviates thousands, millions and billions", () => {
    expect(formatTokens(1_000)).toBe("1.0K");
    expect(formatTokens(15_400)).toBe("15.4K");
    expect(formatTokens(2_500_000)).toBe("2.5M");
    expect(formatTokens(1_250_000_000)).toBe("1.25B");
  });

  it("switches unit exactly at each boundary", () => {
    expect(formatTokens(999_999)).toBe("1000.0K");
    expect(formatTokens(1_000_000)).toBe("1.0M");
  });
});
