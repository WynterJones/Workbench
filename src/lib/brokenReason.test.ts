import { describe, expect, it } from "vitest";
import { explainBrokenReason } from "@/lib/brokenReason";
import type { BrokenReason } from "@/lib/types";

const ALL: BrokenReason[] = [
  "deps-not-installed",
  "missing-env",
  "port-in-use",
  "crashed",
  "timeout",
  "no-run-command",
];

describe("explainBrokenReason", () => {
  it("has human copy for every backend reason code", () => {
    for (const reason of ALL) {
      const copy = explainBrokenReason(reason);
      expect(copy).not.toBeNull();
      expect(copy!.title).not.toContain("-");
      expect(copy!.detail.length).toBeGreaterThan(10);
    }
  });

  it("returns null when there is no reason", () => {
    expect(explainBrokenReason(null)).toBeNull();
    expect(explainBrokenReason(undefined)).toBeNull();
  });

  it("falls back rather than throwing on an unknown code", () => {
    const copy = explainBrokenReason("something-new" as BrokenReason);
    expect(copy!.title).toBe("Could not start");
  });
});
