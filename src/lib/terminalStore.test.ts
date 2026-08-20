import { beforeEach, describe, expect, it } from "vitest";
import {
  clampRect,
  MAX_HEIGHT,
  MIN_HEIGHT,
  MIN_WIDTH,
  useTerminalStore,
} from "@/lib/terminalStore";

const VIEWPORT = { width: 1440, height: 900 };

beforeEach(() => {
  useTerminalStore.setState({
    open: false,
    docked: true,
    rect: { x: 120, y: 120, width: 760, height: 380 },
    dockedHeight: 320,
    cwd: null,
    pending: null,
  });
});

describe("clampRect", () => {
  it("keeps a sensible rect untouched apart from rounding", () => {
    expect(clampRect({ x: 100, y: 80, width: 700, height: 320 }, VIEWPORT)).toEqual({
      x: 100,
      y: 80,
      width: 700,
      height: 320,
    });
  });

  it("never lets the panel leave the viewport", () => {
    const far = clampRect({ x: 5000, y: 5000, width: 700, height: 320 }, VIEWPORT);
    expect(far.x).toBe(VIEWPORT.width - 700);
    expect(far.y).toBe(VIEWPORT.height - 320);

    const negative = clampRect({ x: -400, y: -90, width: 700, height: 320 }, VIEWPORT);
    expect(negative.x).toBe(0);
    expect(negative.y).toBe(0);
  });

  it("enforces minimum size", () => {
    const tiny = clampRect({ x: 0, y: 0, width: 10, height: 10 }, VIEWPORT);
    expect(tiny.width).toBe(MIN_WIDTH);
    expect(tiny.height).toBe(MIN_HEIGHT);
  });

  it("never exceeds the viewport or the max height", () => {
    const huge = clampRect({ x: 0, y: 0, width: 99999, height: 99999 }, VIEWPORT);
    expect(huge.width).toBe(VIEWPORT.width);
    expect(huge.height).toBeLessThanOrEqual(MAX_HEIGHT);
    expect(huge.height).toBeLessThanOrEqual(VIEWPORT.height);
  });

  it("survives a viewport smaller than the minimum size", () => {
    const rect = clampRect({ x: 0, y: 0, width: 700, height: 320 }, { width: 200, height: 120 });
    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
    expect(Number.isFinite(rect.width)).toBe(true);
  });

  it("rounds fractional drag positions", () => {
    expect(clampRect({ x: 10.6, y: 20.4, width: 700.5, height: 320.5 }, VIEWPORT).x).toBe(11);
  });
});

describe("terminal store", () => {
  it("clamps docked height", () => {
    useTerminalStore.getState().setDockedHeight(5);
    expect(useTerminalStore.getState().dockedHeight).toBe(MIN_HEIGHT);
    useTerminalStore.getState().setDockedHeight(99999);
    expect(useTerminalStore.getState().dockedHeight).toBe(MAX_HEIGHT);
  });

  it("openWith opens the panel and stores the command once", () => {
    useTerminalStore.getState().openWith("/tmp/x", "claude");
    expect(useTerminalStore.getState().open).toBe(true);
    expect(useTerminalStore.getState().consumePending()).toBe("claude");
    expect(useTerminalStore.getState().consumePending()).toBeNull();
  });

  it("toggles docking without losing the floating rect", () => {
    const before = useTerminalStore.getState().rect;
    useTerminalStore.getState().setDocked(false);
    expect(useTerminalStore.getState().rect).toEqual(before);
  });
});
