import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProjectStatus } from "@/lib/types";

export type GalleryView = "grid" | "list";
export type MediaKindFilter = "all" | "image" | "video";
export type MediaSort = "modified" | "name" | "size";

interface UserPreferences {
  favoriteFolders: string[];
  toggleFavoriteFolder: (path: string) => void;
  libraryView: GalleryView;
  libraryPageSize: number;
  libraryGridColumns: number;
  libraryListColumns: number;
  libraryStatus: ProjectStatus | "all";
  setLibraryView: (view: GalleryView) => void;
  setLibraryPageSize: (size: number) => void;
  setLibraryColumns: (view: GalleryView, columns: number) => void;
  setLibraryStatus: (status: ProjectStatus | "all") => void;
  mediaView: GalleryView;
  mediaGridColumns: number;
  mediaPageSize: number;
  mediaKind: MediaKindFilter;
  mediaSort: MediaSort;
  setMediaView: (view: GalleryView) => void;
  setMediaGridColumns: (columns: number) => void;
  setMediaPageSize: (size: number) => void;
  setMediaKind: (kind: MediaKindFilter) => void;
  setMediaSort: (sort: MediaSort) => void;
  hiddenMcpIds: string[];
  hideMcp: (id: string) => void;
  showMcp: (id: string) => void;
}

export const useUserPreferences = create<UserPreferences>()(
  persist(
    (set) => ({
      favoriteFolders: [],
      toggleFavoriteFolder: (path) =>
        set((state) => ({
          favoriteFolders: state.favoriteFolders.includes(path)
            ? state.favoriteFolders.filter((favorite) => favorite !== path)
            : [path, ...state.favoriteFolders],
        })),
      libraryView: "grid",
      libraryPageSize: 24,
      libraryGridColumns: 4,
      libraryListColumns: 2,
      libraryStatus: "all",
      setLibraryView: (libraryView) => set({ libraryView }),
      setLibraryPageSize: (libraryPageSize) => set({ libraryPageSize }),
      setLibraryColumns: (view, columns) =>
        set(view === "grid" ? { libraryGridColumns: columns } : { libraryListColumns: columns }),
      setLibraryStatus: (libraryStatus) => set({ libraryStatus }),
      mediaView: "grid",
      mediaGridColumns: 4,
      mediaPageSize: 24,
      mediaKind: "all",
      mediaSort: "modified",
      setMediaView: (mediaView) => set({ mediaView }),
      setMediaGridColumns: (mediaGridColumns) => set({ mediaGridColumns }),
      setMediaPageSize: (mediaPageSize) => set({ mediaPageSize }),
      setMediaKind: (mediaKind) => set({ mediaKind }),
      setMediaSort: (mediaSort) => set({ mediaSort }),
      hiddenMcpIds: [],
      hideMcp: (id) =>
        set((state) => ({
          hiddenMcpIds: state.hiddenMcpIds.includes(id) ? state.hiddenMcpIds : [...state.hiddenMcpIds, id],
        })),
      showMcp: (id) =>
        set((state) => ({ hiddenMcpIds: state.hiddenMcpIds.filter((hiddenId) => hiddenId !== id) })),
    }),
    { name: "workbench-user-preferences" },
  ),
);
