import type { FsEntry } from "@/lib/filesApi";

const NOISE_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "target",
  ".next",
  ".nuxt",
  "venv",
  ".venv",
  "__pycache__",
  "Pods",
]);

export function isNoiseDir(entry: FsEntry): boolean {
  return entry.kind === "dir" && NOISE_DIR_NAMES.has(entry.name);
}

export interface NoiseGroup {
  key: string;
  entries: FsEntry[];
}

export function partitionEntries(entries: FsEntry[]): { visible: FsEntry[]; noise: FsEntry[] } {
  const visible: FsEntry[] = [];
  const noise: FsEntry[] = [];
  for (const entry of entries) {
    if (isNoiseDir(entry)) noise.push(entry);
    else visible.push(entry);
  }
  return { visible, noise };
}
