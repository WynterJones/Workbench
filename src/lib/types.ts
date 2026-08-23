export type ProjectStatus =
  | "unknown"
  | "runnable"
  | "running"
  | "in-progress"
  | "broken"
  | "dead"
  | "shipped";

export type Framework =
  | "nextjs"
  | "vite"
  | "tauri"
  | "rails"
  | "chrome-extension"
  | "godot"
  | "go"
  | "rust"
  | "python"
  | "wordpress"
  | "node"
  | "static"
  | "unknown";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "bundler" | "cargo" | "go" | "pip" | "none";

export type BrokenReason =
  | "deps-not-installed"
  | "missing-env"
  | "port-in-use"
  | "crashed"
  | "timeout"
  | "no-run-command";

export interface Project {
  id: number;
  path: string;
  name: string;
  framework: Framework;
  language: string | null;
  packageManager: PackageManager;
  lastModified: string;
  gitBranch: string | null;
  gitRemote: string | null;
  gitDirty: boolean;
  lastCommitAt: string | null;
  loc: number;
  readmeSummary: string | null;
  runCmd: string | null;
  runUrl: string | null;
  homepage: string | null;
  iconPath: string | null;
  port: number | null;
  status: ProjectStatus;
  brokenReason: BrokenReason | null;
  trusted: boolean;
  archived: boolean;
  shipScore: number | null;
  depsInstalled: boolean;
  hasEnvExample: boolean;
  firstSeen: string;
  lastScanned: string;
  tags: string[];
  screenshotDesktop: string | null;
  screenshotMobile: string | null;
}

export interface ScanRoot {
  id: number;
  path: string;
  enabled: boolean;
  lastScanned: string | null;
  projectCount: number;
}

export interface ScanProgress {
  scanned: number;
  found: number;
  currentPath: string;
  done: boolean;
}

export interface ActivityEvent {
  id: number;
  projectId: number;
  kind: "created" | "commit" | "modified" | "screenshot" | "scanned" | "run";
  occurredAt: string;
  detail: string | null;
}

export interface ShipSignal {
  key: string;
  label: string;
  passed: boolean;
  weight: number;
}

export interface ShipScore {
  score: number;
  signals: ShipSignal[];
  effortEstimate: string;
}

export interface RunResult {
  projectId: number;
  url: string | null;
  ok: boolean;
  reason: BrokenReason | null;
  logTail: string;
}

export interface LibraryStats {
  total: number;
  runnable: number;
  shipped: number;
  broken: number;
  withScreenshots: number;
  byFramework: Record<string, number>;
  totalLoc: number;
  oldestProject: string | null;
}

export type ShelfId =
  | "continue"
  | "gems"
  | "discovered"
  | "shipped"
  | "experiments"
  | "in-progress"
  | "attention"
  | "dead"
  | "archived"
  | "all";

export interface ProjectQuery {
  shelf: ShelfId;
  search: string;
  frameworks: Framework[];
  tags: string[];
  sort: "modified" | "name" | "score" | "discovered";
}

export type AiProvider = "claude-code" | "codex";

export interface AiSession {
  projectId: number;
  provider: AiProvider;
  tmuxSession: string;
  attachCommand: string;
}

export interface Settings {
  aiProvider: AiProvider;
  editor: "vscode" | "cursor" | "zed" | "webstorm";
  terminal: "terminal" | "iterm" | "warp" | "ghostty";
  autoScreenshot: boolean;
  concurrentRuns: number;
  introSeen: boolean;
}
