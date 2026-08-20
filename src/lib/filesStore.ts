import { create } from "zustand";
import type { FsKind, FsSortBy } from "@/lib/filesApi";

export type FilesView = "columns" | "list";
export type FilesMode = "browse" | "starters" | "reclaim";

interface FilesState {
  rootPath: string;
  setRoot: (path: string) => void;

  selectedPath: string | null;
  selectedKind: FsKind | null;
  select: (path: string | null, kind: FsKind | null) => void;

  history: string[];
  historyIndex: number;
  navigateTo: (path: string) => void;
  navigateBack: () => void;
  navigateForward: () => void;

  mode: FilesMode;
  setMode: (mode: FilesMode) => void;

  view: FilesView;
  setView: (view: FilesView) => void;

  showHidden: boolean;
  toggleShowHidden: () => void;

  sortBy: FsSortBy;
  sortDesc: boolean;
  setSort: (sortBy: FsSortBy, sortDesc: boolean) => void;

  noiseCollapsed: boolean;
  toggleNoiseCollapsed: () => void;

  previewExpanded: boolean;
  togglePreview: () => void;
  setPreviewExpanded: (expanded: boolean) => void;

  focusedPane: number;
  setFocusedPane: (pane: number) => void;

  renamingPath: string | null;
  setRenamingPath: (path: string | null) => void;

  selectedPaths: Set<string>;
  setMultiSelect: (paths: Set<string>) => void;

  newFileRequested: boolean;
  requestNewFile: () => void;
  clearNewFileRequest: () => void;
}

export const useFilesStore = create<FilesState>((set, get) => ({
  rootPath: "",
  setRoot: (path) => {
    const { history, historyIndex } = get();
    const trimmed = history.slice(0, historyIndex + 1);
    set({
      rootPath: path,
      selectedPath: null,
      selectedKind: null,
      focusedPane: 0,
      selectedPaths: new Set(),
      history: [...trimmed, path],
      historyIndex: trimmed.length,
    });
  },

  selectedPath: null,
  selectedKind: null,
  select: (path, kind) => set({ selectedPath: path, selectedKind: kind }),

  history: [],
  historyIndex: -1,
  navigateTo: (path) => get().setRoot(path),
  navigateBack: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    set({ rootPath: history[nextIndex], historyIndex: nextIndex, selectedPath: null, selectedKind: null });
  },
  navigateForward: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    set({ rootPath: history[nextIndex], historyIndex: nextIndex, selectedPath: null, selectedKind: null });
  },

  mode: "browse",
  setMode: (mode) => set({ mode }),

  view: "columns",
  setView: (view) => set({ view }),

  showHidden: false,
  toggleShowHidden: () => set((s) => ({ showHidden: !s.showHidden })),

  sortBy: "name",
  sortDesc: false,
  setSort: (sortBy, sortDesc) => set({ sortBy, sortDesc }),

  noiseCollapsed: true,
  toggleNoiseCollapsed: () => set((s) => ({ noiseCollapsed: !s.noiseCollapsed })),

  previewExpanded: false,
  togglePreview: () => set((s) => ({ previewExpanded: !s.previewExpanded })),
  setPreviewExpanded: (expanded) => set({ previewExpanded: expanded }),

  focusedPane: 0,
  setFocusedPane: (pane) => set({ focusedPane: pane }),

  renamingPath: null,
  setRenamingPath: (path) => set({ renamingPath: path }),

  selectedPaths: new Set(),
  setMultiSelect: (paths) => set({ selectedPaths: paths }),

  newFileRequested: false,
  requestNewFile: () => set({ newFileRequested: true }),
  clearNewFileRequest: () => set({ newFileRequested: false }),
}));
