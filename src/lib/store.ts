import { create } from "zustand";
import type { Framework, ShelfId } from "@/lib/types";

export type Route = "intro" | "library" | "project" | "settings";

export interface CommandPaletteItem {
  id: string;
  label: string;
  hint?: string;
  group: string;
  onSelect: () => void;
}

interface AppState {
  route: Route;
  setRoute: (route: Route) => void;

  shelf: ShelfId;
  setShelf: (shelf: ShelfId) => void;

  search: string;
  setSearch: (search: string) => void;

  frameworks: Framework[];
  setFrameworks: (frameworks: Framework[]) => void;

  tags: string[];
  setTags: (tags: string[]) => void;

  sort: "modified" | "name" | "score" | "discovered";
  setSort: (sort: "modified" | "name" | "score" | "discovered") => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  selectedProjectId: number | null;
  openProject: (id: number) => void;
  closeProject: () => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  commandItems: CommandPaletteItem[];
  setCommandItems: (items: CommandPaletteItem[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  route: "intro",
  setRoute: (route) => set({ route }),

  shelf: "continue",
  setShelf: (shelf) => set({ shelf, route: "library" }),

  search: "",
  setSearch: (search) => set({ search }),

  frameworks: [],
  setFrameworks: (frameworks) => set({ frameworks }),

  tags: [],
  setTags: (tags) => set({ tags }),

  sort: "modified",
  setSort: (sort) => set({ sort }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  selectedProjectId: null,
  openProject: (id) => set({ selectedProjectId: id, route: "project" }),
  closeProject: () => set({ selectedProjectId: null, route: "library" }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  commandItems: [],
  setCommandItems: (items) => set({ commandItems: items }),
}));
