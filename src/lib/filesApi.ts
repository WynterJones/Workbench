import { invoke } from "@tauri-apps/api/core";

export type FsKind = "file" | "dir" | "symlink";

export type GitStatus = "modified" | "untracked" | "staged" | "ignored" | null;

export interface FileContents {
  kind: "text" | "binary";
  text: string | null;
  sizeBytes: number;
  truncated: boolean;
}

export interface FsEntry {
  name: string;
  path: string;
  kind: FsKind;
  size: number;
  modified: string;
  extension: string | null;
  isHidden: boolean;
  isPackage: boolean;
  childCount: number | null;
  gitStatus: GitStatus;
  projectFramework: string | null;
}

export type FsSortBy = "name" | "size" | "modified" | "kind";

export interface ListDirOpts {
  showHidden: boolean;
  sortBy: FsSortBy;
  sortDesc: boolean;
}

export interface FsInfo {
  path: string;
  kind: FsKind;
  size: number;
  modified: string;
  created: string | null;
  isProject: boolean;
  framework: string | null;
  gitBranch: string | null;
  gitDirty: boolean | null;
  readmeExcerpt: string | null;
  entryCount: number | null;
}

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  stack: string[];
  tags: string[];
  command: string;
  docsUrl: string | null;
  category: string;
  useCount?: number;
}

export interface ScaffoldResult {
  ok: boolean;
  projectPath: string;
  message: string | null;
}

export interface FileTemplate {
  id: string;
  label: string;
  description: string;
  kind: "component" | "route" | "hook" | "api" | "test" | "store" | "file";
}

export interface BuildContextOpts {
  respectGitignore: boolean;
  skipBinary: boolean;
  maxChars: number;
}

export interface DiskReclaimEntry {
  path: string;
  kind: string;
  sizeBytes: number;
  projectPath: string | null;
}

export const filesApi = {
  listDir: (path: string, opts: ListDirOpts) => invoke<FsEntry[]>("fs_list_dir", { path, opts }),

  readFile: (path: string, maxBytes?: number) =>
    invoke<FileContents>("fs_read_file", { path, maxBytes }),

  createDir: (parentPath: string, name: string) =>
    invoke<string>("fs_create_dir", { path: `${parentPath.replace(/\/$/, "")}/${name}` }),
  createFile: (path: string, contents: string) => invoke<FsEntry>("fs_create_file", { path, contents }),
  renameEntry: (path: string, newName: string) => invoke<FsEntry>("fs_rename", { path, newName }),
  moveEntries: (paths: string[], dest: string) => invoke<void>("fs_move_entries", { paths, destDir: dest }),
  copyEntries: (paths: string[], dest: string) => invoke<void>("fs_copy_entries", { paths, destDir: dest }),
  trashEntries: (paths: string[]) => invoke<void>("fs_trash_entries", { paths }),
  getInfo: (path: string) => invoke<FsInfo>("fs_get_info", { path }),

  listStarters: () => invoke<StarterTemplate[]>("fs_list_starters"),
  scaffoldStarter: (starterId: string, parentDir: string, projectName: string, confirmed: boolean) =>
    invoke<ScaffoldResult>("fs_scaffold_starter", { starterId, parentDir, projectName, confirmed }),
  saveStarter: (starter: StarterTemplate) => invoke<void>("fs_save_starter", { template: starter }),
  deleteStarter: (starterId: string) => invoke<void>("fs_delete_starter", { id: starterId }),
  saveFolderAsStarter: (path: string, name: string) =>
    invoke<StarterTemplate>("fs_save_folder_as_starter", { path, name }),

  fileTemplates: (framework: string | null) => invoke<FileTemplate[]>("fs_file_templates", { framework }),
  createFromTemplate: (dir: string, templateId: string, name: string) =>
    invoke<FsEntry>("fs_create_from_template", { dir, templateId, name }),

  buildContext: (paths: string[], opts: BuildContextOpts) =>
    invoke<string>("fs_build_context", { paths, opts }),

  diskReclaimScan: () => invoke<DiskReclaimEntry[]>("disk_reclaim_scan"),
};
