import {
  Box,
  Braces,
  Coffee,
  Cog,
  Database,
  File,
  FileArchive,
  FileAudio,
  FileCode2,
  FileImage,
  FileJson,
  FileText,
  FileType,
  FileVideo,
  Folder,
  FolderGit2,
  FolderLock,
  Gem,
  Image,
  Package,
  type LucideIcon,
} from "lucide-react";
import type { FsEntry } from "@/lib/filesApi";

const EXT_ICONS: Record<string, LucideIcon> = {
  ts: FileCode2,
  tsx: FileCode2,
  js: FileCode2,
  jsx: FileCode2,
  mjs: FileCode2,
  cjs: FileCode2,
  rs: Cog,
  go: FileCode2,
  py: FileCode2,
  rb: Gem,
  php: FileCode2,
  java: Coffee,
  json: FileJson,
  jsonc: FileJson,
  toml: Braces,
  yaml: Braces,
  yml: Braces,
  md: FileText,
  mdx: FileText,
  txt: FileText,
  css: FileType,
  scss: FileType,
  html: FileType,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  svg: Image,
  webp: FileImage,
  mp4: FileVideo,
  mov: FileVideo,
  mp3: FileAudio,
  wav: FileAudio,
  zip: FileArchive,
  tar: FileArchive,
  gz: FileArchive,
  sqlite: Database,
  db: Database,
  lock: Package,
};

export function iconForEntry(entry: FsEntry): LucideIcon {
  if (entry.kind === "dir") {
    if (entry.name === ".git") return FolderGit2;
    if (entry.isHidden) return FolderLock;
    return Folder;
  }
  if (entry.name === ".gitignore" || entry.name === ".gitattributes") return FolderGit2;
  if (entry.name === "package.json" || entry.name.endsWith(".lock")) return Package;
  if (entry.name.toLowerCase() === "license") return FileText;
  if (entry.name === "Dockerfile") return Box;
  const ext = entry.extension?.toLowerCase() ?? "";
  return EXT_ICONS[ext] ?? File;
}
