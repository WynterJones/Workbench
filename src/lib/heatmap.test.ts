import { describe, expect, it } from "vitest";
import { heatmapWeeks, levelFor, monthLabels } from "@/lib/heatmap";
import type { HeatmapDay } from "@/hooks/useHeatmap";

function makeDays(start: string, count: number, commits = 0): HeatmapDay[] {
  const days: HeatmapDay[] = [];
  const date = new Date(`${start}T00:00:00`);
  for (let i = 0; i < count; i += 1) {
    days.push({ date: date.toISOString().slice(0, 10), count: commits });
    date.setDate(date.getDate() + 1);
  }
  return days;
}

describe("heatmapWeeks", () => {
  it("returns nothing for an empty range", () => {
    expect(heatmapWeeks([])).toEqual([]);
  });

  it("pads the first week so days land on the right weekday row", () => {
    const weeks = heatmapWeeks(makeDays("2026-01-01", 10));
    expect(weeks[0]).toHaveLength(7);
    const leadingBlanks = weeks[0].filter((d) => d === null).length;
    expect(leadingBlanks).toBe(new Date("2026-01-01T00:00:00").getDay());
  });

  it("pads the final partial week to seven cells", () => {
    const weeks = heatmapWeeks(makeDays("2026-01-01", 10));
    expect(weeks[weeks.length - 1]).toHaveLength(7);
  });

  it("keeps every day exactly once", () => {
    const days = makeDays("2026-01-01", 365);
    const flat = heatmapWeeks(days).flat().filter(Boolean);
    expect(flat).toHaveLength(365);
  });
});

describe("monthLabels", () => {
  it("groups consecutive weeks under one month label", () => {
    const labels = monthLabels(heatmapWeeks(makeDays("2026-01-01", 90)));
    const totalSpan = labels.reduce((sum, label) => sum + label.span, 0);
    expect(labels.length).toBeGreaterThan(1);
    expect(totalSpan).toBe(heatmapWeeks(makeDays("2026-01-01", 90)).length);
  });
});

describe("levelFor", () => {
  it("gives zero commits the empty level", () => {
    expect(levelFor(0, 10)).toBe(0);
  });

  it("scales relative to the busiest day", () => {
    expect(levelFor(1, 20)).toBe(1);
    expect(levelFor(10, 20)).toBe(2);
    expect(levelFor(15, 20)).toBe(3);
    expect(levelFor(20, 20)).toBe(4);
  });

  it("treats a single-commit maximum as fully lit", () => {
    expect(levelFor(1, 1)).toBe(4);
  });
});
