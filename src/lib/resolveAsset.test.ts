import { describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => `asset://${path}`,
}));

const { resolveAsset } = await import("@/lib/resolveAsset");

describe("resolveAsset", () => {
  it("leaves remote and data urls untouched", () => {
    expect(resolveAsset("https://example.com/a.png", "/proj")).toBe("https://example.com/a.png");
    expect(resolveAsset("http://example.com/a.png", "/proj")).toBe("http://example.com/a.png");
    expect(resolveAsset("data:image/png;base64,AAA", "/proj")).toBe("data:image/png;base64,AAA");
  });

  it("resolves relative paths against the project directory", () => {
    expect(resolveAsset("assets/logo.png", "/proj")).toBe("asset:///proj/assets/logo.png");
    expect(resolveAsset("./assets/logo.png", "/proj")).toBe("asset:///proj/assets/logo.png");
    expect(resolveAsset("/assets/logo.png", "/proj")).toBe("asset:///proj/assets/logo.png");
  });

  it("strips query strings and fragments", () => {
    expect(resolveAsset("logo.png?v=2", "/proj")).toBe("asset:///proj/logo.png");
    expect(resolveAsset("logo.png#top", "/proj")).toBe("asset:///proj/logo.png");
  });

  it("tolerates a trailing slash on the base path", () => {
    expect(resolveAsset("logo.png", "/proj/")).toBe("asset:///proj/logo.png");
  });

  it("returns the original when there is no base path", () => {
    expect(resolveAsset("logo.png", null)).toBe("logo.png");
    expect(resolveAsset(undefined, "/proj")).toBeUndefined();
  });
});
