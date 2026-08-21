import { describe, expect, it } from "vitest";
import { faviconUrl, normalizeHttpUrl } from "@/lib/url";

describe("project URLs", () => {
  it("normalizes web links and rejects other values", () => {
    expect(normalizeHttpUrl("example.com/docs")).toBe("https://example.com/docs");
    expect(normalizeHttpUrl("ftp://example.com")).toBeNull();
    expect(faviconUrl("https://example.com/docs")).toBe("https://example.com/favicon.ico");
  });
});
