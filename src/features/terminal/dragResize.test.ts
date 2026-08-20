import { describe, expect, it } from "vitest";
import { applyGesture } from "@/features/terminal/useDragResize";

const ORIGIN = { x: 100, y: 100, width: 600, height: 300 };
const base = { startX: 500, startY: 500, origin: ORIGIN };

describe("applyGesture", () => {
  it("moves without changing size", () => {
    const next = applyGesture({ ...base, handle: "move" }, 550, 470);
    expect(next).toEqual({ x: 150, y: 70, width: 600, height: 300 });
  });

  it("grows from the south east corner", () => {
    const next = applyGesture({ ...base, handle: "se" }, 560, 540);
    expect(next).toEqual({ x: 100, y: 100, width: 660, height: 340 });
  });

  it("moves the origin when dragging the west edge", () => {
    const next = applyGesture({ ...base, handle: "w" }, 460, 500);
    expect(next.x).toBe(60);
    expect(next.width).toBe(640);
  });

  it("moves the origin when dragging the north edge", () => {
    const next = applyGesture({ ...base, handle: "n" }, 500, 460);
    expect(next.y).toBe(60);
    expect(next.height).toBe(340);
  });

  it("handles a corner that both moves and resizes", () => {
    const next = applyGesture({ ...base, handle: "nw" }, 480, 480);
    expect(next).toEqual({ x: 80, y: 80, width: 620, height: 320 });
  });

  it("is a no-op when the pointer has not moved", () => {
    expect(applyGesture({ ...base, handle: "se" }, 500, 500)).toEqual(ORIGIN);
  });
});
