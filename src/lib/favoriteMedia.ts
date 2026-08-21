import { useEffect, useState } from "react";
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

export function favoriteClickAction(favorite: boolean, confirming: boolean) {
  return !favorite || confirming ? "toggle" : "confirm";
}

export function useConfirmUnfavorite(path: string) {
  const paths = useFavoriteMedia((state) => state.paths);
  const toggle = useFavoriteMedia((state) => state.toggle);
  const favorite = paths.includes(path);
  const [confirmingPath, setConfirmingPath] = useState<string | null>(null);
  const confirming = confirmingPath === path;

  useEffect(() => {
    if (!confirmingPath) return;
    const timeout = window.setTimeout(() => setConfirmingPath(null), 3_000);
    return () => window.clearTimeout(timeout);
  }, [confirmingPath]);

  function act() {
    if (favoriteClickAction(favorite, confirming) === "toggle") {
      toggle(path);
      setConfirmingPath(null);
    } else {
      setConfirmingPath(path);
    }
  }

  return { favorite, confirming, act };
}
