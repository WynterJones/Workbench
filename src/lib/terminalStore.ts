import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MIN_WIDTH = 380;
export const MIN_HEIGHT = 160;
export const MAX_HEIGHT = 900;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function clampRect(rect: Rect, viewport: { width: number; height: number }): Rect {
  const width = Math.max(MIN_WIDTH, Math.min(rect.width, viewport.width));
  const height = Math.max(MIN_HEIGHT, Math.min(rect.height, Math.min(MAX_HEIGHT, viewport.height)));
  return {
    width: Math.round(width),
    height: Math.round(height),
    x: Math.round(Math.max(0, Math.min(rect.x, viewport.width - width))),
    y: Math.round(Math.max(0, Math.min(rect.y, viewport.height - height))),
  };
}

interface TerminalState {
  open: boolean;
  fullscreen: boolean;
  docked: boolean;
  rect: Rect;
  dockedHeight: number;
  cwd: string | null;
  pending: string | null;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setDocked: (docked: boolean) => void;
  toggleFullscreen: () => void;
  setRect: (rect: Rect) => void;
  setDockedHeight: (height: number) => void;
  openWith: (cwd: string | null, command?: string) => void;
  consumePending: () => string | null;
}

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set, get) => ({
      open: false,
      fullscreen: false,
      docked: true,
      rect: { x: 120, y: 120, width: 760, height: 380 },
      dockedHeight: 320,
      cwd: null,
      pending: null,
      setOpen: (open) => set({ open }),
      toggle: () => set((state) => ({ open: !state.open })),
      setDocked: (docked) => set({ docked, fullscreen: false }),
      toggleFullscreen: () => set((state) => ({ fullscreen: !state.fullscreen, open: true })),
      setRect: (rect) => set({ rect }),
      setDockedHeight: (height) =>
        set({ dockedHeight: Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(height))) }),
      openWith: (cwd, command) => set({ open: true, cwd, pending: command ?? null }),
      consumePending: () => {
        const { pending } = get();
        if (pending) set({ pending: null });
        return pending;
      },
    }),
    {
      name: "workbench-terminal",
      partialize: (state) => ({
        open: state.open,
        fullscreen: state.fullscreen,
        docked: state.docked,
        rect: state.rect,
        dockedHeight: state.dockedHeight,
      }),
    },
  ),
);
