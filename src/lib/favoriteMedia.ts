import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FavoriteMediaState {
  paths: string[];
  toggle: (path: string) => void;
  remove: (path: string) => void;
  clear: () => void;
  has: (path: string) => boolean;
}

export const useFavoriteMedia = create<FavoriteMediaState>()(
  persist(
    (set, get) => ({
      paths: [],
      toggle: (path) =>
        set((state) => ({
          paths: state.paths.includes(path)
            ? state.paths.filter((p) => p !== path)
            : [path, ...state.paths],
        })),
      remove: (path) => set((state) => ({ paths: state.paths.filter((p) => p !== path) })),
      clear: () => set({ paths: [] }),
      has: (path) => get().paths.includes(path),
    }),
    { name: "workbench-favorite-media" },
  ),
);
