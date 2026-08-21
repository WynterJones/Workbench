import { describe, expect, it } from "vitest";
import { isNewerVersion } from "./update";

describe("isNewerVersion", () => {
  it("only accepts a newer semantic version", () => {
    expect(isNewerVersion("v1.0.3", "1.0.2")).toBe(true);
    expect(isNewerVersion("v1.10.0", "1.9.9")).toBe(true);
    expect(isNewerVersion("v1.0.2", "1.0.2")).toBe(false);
    expect(isNewerVersion("v1.0.1", "1.0.2")).toBe(false);
    expect(isNewerVersion("latest", "1.0.2")).toBe(false);
  });
});
