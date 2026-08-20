import { File, Folder, type LucideIcon } from "lucide-react";
import type { FsKind } from "@/lib/filesApi";

export function iconForKind(kind: FsKind): LucideIcon {
  return kind === "dir" ? Folder : File;
}
