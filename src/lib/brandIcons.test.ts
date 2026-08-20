import { describe, expect, it } from "vitest";
import { brandByName, frameworkBrand } from "@/lib/brandIcons";
import type { Framework } from "@/lib/types";

const FRAMEWORKS: Framework[] = [
  "nextjs",
  "vite",
  "tauri",
  "rails",
  "chrome-extension",
  "godot",
  "go",
  "rust",
  "python",
  "wordpress",
  "node",
  "static",
];

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe("brand icons", () => {
  it("resolves a mark for every known framework", () => {
    const missing = FRAMEWORKS.filter((f) => frameworkBrand(f) === null);
    expect(missing).toEqual([]);
  });

  it("returns null for unknown rather than throwing", () => {
    expect(frameworkBrand("unknown")).toBeNull();
    expect(brandByName("not-a-real-thing")).toBeNull();
  });

  it("lifts near-black brand colors so they stay visible on a dark background", () => {
    const nextjs = frameworkBrand("nextjs");
    const rust = frameworkBrand("rust");
    expect(luminance(nextjs!.hex)).toBeGreaterThan(0.3);
    expect(luminance(rust!.hex)).toBeGreaterThan(0.3);
  });

  it("leaves already-bright brand colors close to their real value", () => {
    expect(frameworkBrand("go")!.hex.toLowerCase()).toBe("#00add8");
    expect(brandByName("react")!.hex.toLowerCase()).toBe("#61dafb");
  });
});
