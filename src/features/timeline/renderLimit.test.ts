import { describe, expect, it } from "vitest";
import { LOOKAHEAD } from "@/features/timeline/revealStyle";

interface Group {
  key: string;
  events: { id: string }[];
}

function renderedIndices(groups: Group[], renderLimit: number): string[] {
  const rendered: string[] = [];
  let index = -1;

  for (const group of groups) {
    if (index + 1 >= renderLimit) {
      index += group.events.length;
      continue;
    }
    for (const event of group.events) {
      index += 1;
      if (index >= renderLimit) continue;
      rendered.push(`${event.id}@${index}`);
    }
  }

  return rendered;
}

const GROUPS: Group[] = [
  { key: "a", events: [{ id: "a1" }, { id: "a2" }] },
  { key: "b", events: [{ id: "b1" }, { id: "b2" }, { id: "b3" }] },
  { key: "c", events: [{ id: "c1" }] },
];

describe("timeline render window", () => {
  it("assigns each event a stable global index regardless of the limit", () => {
    const all = renderedIndices(GROUPS, 99);
    expect(all).toEqual(["a1@0", "a2@1", "b1@2", "b2@3", "b3@4", "c1@5"]);
  });

  it("keeps indices aligned when whole sections are skipped", () => {
    const partial = renderedIndices(GROUPS, 3);
    expect(partial).toEqual(["a1@0", "a2@1", "b1@2"]);
  });

  it("renders nothing at a zero limit", () => {
    expect(renderedIndices(GROUPS, 0)).toEqual([]);
  });

  it("never renders past the limit", () => {
    for (let limit = 0; limit <= 8; limit += 1) {
      expect(renderedIndices(GROUPS, limit).length).toBe(Math.min(limit, 6));
    }
  });

  it("keeps a lookahead of hidden rows available to fade in", () => {
    expect(LOOKAHEAD).toBeGreaterThan(0);
  });
});
