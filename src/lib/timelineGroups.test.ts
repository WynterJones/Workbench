import { describe, expect, it } from "vitest";
import { groupByMonth, spanInYears, yearOf } from "@/lib/timelineGroups";
import type { TimelineEvent } from "@/hooks/useProjectTimeline";

function event(id: string, occurredAt: string): TimelineEvent {
  return {
    id,
    kind: "commit",
    projectId: 1,
    projectName: "Demo",
    framework: "node",
    occurredAt,
    title: "x",
    detail: null,
  };
}

describe("groupByMonth", () => {
  it("returns nothing for an empty list", () => {
    expect(groupByMonth([])).toEqual([]);
  });

  it("collapses consecutive events in the same month into one group", () => {
    const groups = groupByMonth([
      event("a", "2026-08-20T10:00:00Z"),
      event("b", "2026-08-01T10:00:00Z"),
      event("c", "2026-07-30T10:00:00Z"),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].events).toHaveLength(2);
    expect(groups[1].events).toHaveLength(1);
  });

  it("keeps every event exactly once", () => {
    const input = Array.from({ length: 40 }, (_, i) =>
      event(`e${i}`, `2026-${String((i % 12) + 1).padStart(2, "0")}-01T00:00:00Z`),
    );
    const flat = groupByMonth(input).flatMap((g) => g.events);
    expect(flat).toHaveLength(40);
  });

  it("skips events with an unparseable date rather than throwing", () => {
    const groups = groupByMonth([event("bad", "not-a-date"), event("good", "2026-01-01T00:00:00Z")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].events[0].id).toBe("good");
  });

  it("does not merge the same month across different years", () => {
    const groups = groupByMonth([
      event("a", "2026-03-01T00:00:00Z"),
      event("b", "2025-03-01T00:00:00Z"),
    ]);
    expect(groups).toHaveLength(2);
  });
});

describe("yearOf", () => {
  it("reads the year from a group key", () => {
    expect(yearOf("2026-08")).toBe("2026");
  });
});

describe("spanInYears", () => {
  it("is zero when either end is missing", () => {
    expect(spanInYears(null, "2020-01-01T00:00:00Z")).toBe(0);
    expect(spanInYears("2026-01-01T00:00:00Z", null)).toBe(0);
  });

  it("measures the distance between the newest and oldest event", () => {
    const span = spanInYears("2026-01-01T00:00:00Z", "2020-01-01T00:00:00Z");
    expect(span).toBeGreaterThan(5.9);
    expect(span).toBeLessThan(6.1);
  });

  it("never returns a negative span", () => {
    expect(spanInYears("2020-01-01T00:00:00Z", "2026-01-01T00:00:00Z")).toBe(0);
  });
});
