import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TerminalState {
  open: boolean;
  height: number;
  cwd: string | null;
  pending: string | null;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setHeight: (height: number) => void;
  openWith: (cwd: string | null, command?: string) => void;
  consumePending: () => string | null;
}

export const MIN_HEIGHT = 160;
export const MAX_HEIGHT = 760;

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set, get) => ({
      open: false,
      height: 320,
      cwd: null,
      pending: null,
      setOpen: (open) => set({ open }),
      toggle: () => set((state) => ({ open: !state.open })),
      setHeight: (height) =>
        set({ height: Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(height))) }),
      openWith: (cwd, command) => set({ open: true, cwd, pending: command ?? null }),
      consumePending: () => {
        const { pending } = get();
        if (pending) set({ pending: null });
        return pending;
      },
    }),
    {
      name: "workbench-terminal",
      partialize: (state) => ({ height: state.height, open: state.open }),
    },
  ),
);
