import { describe, expect, it } from "vitest";
import { favoriteClickAction } from "@/lib/favoriteMedia";

describe("favorite media removal", () => {
  it("requires confirmation only when removing an existing favorite", () => {
    expect(favoriteClickAction(false, false)).toBe("toggle");
    expect(favoriteClickAction(true, false)).toBe("confirm");
    expect(favoriteClickAction(true, true)).toBe("toggle");
  });
});
