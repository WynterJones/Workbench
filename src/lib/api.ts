import { invoke } from "@tauri-apps/api/core";
import type {
  AiProvider,
  AiSession,
  ActivityEvent,
  LibraryStats,
  Project,
  ProjectQuery,
  RunResult,
  ScanRoot,
  Settings,
  ShipScore,
} from "./types";

export const api = {
  listProjects: (query: ProjectQuery) => invoke<Project[]>("list_projects", { query }),
  getProject: (id: number) => invoke<Project>("get_project", { id }),
  updateProject: (id: number, patch: Partial<Project>) =>
    invoke<Project>("update_project", { id, patch }),
  setTags: (id: number, tags: string[]) => invoke<void>("set_tags", { id, tags }),
  archiveProject: (id: number, archived: boolean) =>
    invoke<void>("archive_project", { id, archived }),

  listRoots: () => invoke<ScanRoot[]>("list_roots"),
  addRoot: (path: string) => invoke<ScanRoot>("add_root", { path }),
  removeRoot: (id: number) => invoke<void>("remove_root", { id }),
  pickFolder: () => invoke<string | null>("pick_folder"),
  startScan: () => invoke<void>("start_scan"),

  stats: () => invoke<LibraryStats>("library_stats"),
  activity: (projectId: number) => invoke<ActivityEvent[]>("project_activity", { projectId }),
  shipScore: (projectId: number) => invoke<ShipScore>("ship_score", { projectId }),
  todos: (projectId: number) => invoke<string[]>("project_todos", { projectId }),

  runProject: (id: number) => invoke<RunResult>("run_project", { id }),
  stopProject: (id: number) => invoke<void>("stop_project", { id }),
  captureAll: () => invoke<void>("capture_all"),

  openIn: (target: "finder" | "terminal" | "editor" | "browser" | "github", id: number) =>
    invoke<void>("open_in", { target, id }),
  startAiSession: (id: number, provider: AiProvider) =>
    invoke<AiSession>("start_ai_session", { id, provider }),

  getSettings: () => invoke<Settings>("get_settings"),
  saveSettings: (settings: Settings) => invoke<Settings>("save_settings", { settings }),
};
