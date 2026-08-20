import { beforeEach, describe, expect, it } from "vitest";
import { MAX_HEIGHT, MIN_HEIGHT, useTerminalStore } from "@/lib/terminalStore";

beforeEach(() => {
  useTerminalStore.setState({ open: false, height: 320, cwd: null, pending: null });
});

describe("terminal store", () => {
  it("clamps height within bounds", () => {
    const { setHeight } = useTerminalStore.getState();
    setHeight(10);
    expect(useTerminalStore.getState().height).toBe(MIN_HEIGHT);
    setHeight(99999);
    expect(useTerminalStore.getState().height).toBe(MAX_HEIGHT);
    setHeight(400);
    expect(useTerminalStore.getState().height).toBe(400);
  });

  it("rounds fractional heights from drag deltas", () => {
    useTerminalStore.getState().setHeight(321.7);
    expect(useTerminalStore.getState().height).toBe(322);
  });

  it("openWith opens the panel and stores the command", () => {
    useTerminalStore.getState().openWith("/tmp/x", "claude");
    const state = useTerminalStore.getState();
    expect(state.open).toBe(true);
    expect(state.cwd).toBe("/tmp/x");
    expect(state.pending).toBe("claude");
  });

  it("consumePending returns the command once and then clears it", () => {
    useTerminalStore.getState().openWith("/tmp/x", "codex");
    expect(useTerminalStore.getState().consumePending()).toBe("codex");
    expect(useTerminalStore.getState().consumePending()).toBeNull();
  });

  it("toggle flips open state", () => {
    useTerminalStore.getState().toggle();
    expect(useTerminalStore.getState().open).toBe(true);
    useTerminalStore.getState().toggle();
    expect(useTerminalStore.getState().open).toBe(false);
  });
});
