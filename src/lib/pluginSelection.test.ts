import { describe, expect, it } from "vitest";
import {
  authorsFor,
  formatSelection,
  parseSelection,
  selectedSources,
  toggleAuthor,
  toggleSource,
} from "@/lib/pluginSelection";

describe("pluginSelection", () => {
  it("round-trips a repository with and without authors", () => {
    expect(parseSelection("acme/web")).toEqual({ source: "acme/web", authors: [] });
    expect(parseSelection("acme/web#wynter,bob")).toEqual({
      source: "acme/web",
      authors: ["wynter", "bob"],
    });
    expect(formatSelection({ source: "acme/web", authors: [] })).toBe("acme/web");
    expect(formatSelection({ source: "acme/web", authors: ["wynter"] })).toBe("acme/web#wynter");
  });

  it("reads sources and authors out of a saved selection", () => {
    const selected = ["acme/web#wynter", "acme/api"];
    expect(selectedSources(selected)).toEqual(["acme/web", "acme/api"]);
    expect(authorsFor(selected, "acme/web")).toEqual(["wynter"]);
    expect(authorsFor(selected, "acme/api")).toEqual([]);
    expect(authorsFor(selected, "acme/nope")).toEqual([]);
  });

  it("toggling a source ignores its author suffix", () => {
    expect(toggleSource(["acme/web#wynter"], "acme/web")).toEqual([]);
    expect(toggleSource(["acme/api"], "acme/web")).toEqual(["acme/api", "acme/web"]);
  });

  it("toggling an author edits that repository in place", () => {
    const one = toggleAuthor(["acme/web", "acme/api"], "acme/web", "wynter");
    expect(one).toEqual(["acme/web#wynter", "acme/api"]);

    const two = toggleAuthor(one, "acme/web", "bob");
    expect(two).toEqual(["acme/web#wynter,bob", "acme/api"]);

    expect(toggleAuthor(two, "acme/web", "wynter")).toEqual(["acme/web#bob", "acme/api"]);
    expect(toggleAuthor(["acme/web#bob"], "acme/web", "bob")).toEqual(["acme/web"]);
  });

  it("watching an author on an unpicked repository picks it too", () => {
    expect(toggleAuthor([], "acme/web", "wynter")).toEqual(["acme/web#wynter"]);
  });
});
