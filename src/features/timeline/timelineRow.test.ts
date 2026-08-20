import { describe, expect, it } from "vitest";

function dayNumber(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return String(date.getDate()).padStart(2, "0");
}

describe("dayNumber", () => {
  it("returns a zero-padded day of month regardless of locale ordering", () => {
    expect(dayNumber("2026-07-08T12:00:00")).toBe("08");
    expect(dayNumber("2026-07-19T12:00:00")).toBe("19");
  });

  it("never returns a month abbreviation", () => {
    expect(dayNumber("2026-06-15T12:00:00")).toMatch(/^\d{2}$/);
  });

  it("returns an empty string for an unparseable date", () => {
    expect(dayNumber("nope")).toBe("");
  });
});
