import { useState } from "react";
import { ChevronRightIcon, HardDriveIcon } from "lucide-react";
import { useFilesStore } from "@/lib/filesStore";
import { useFsMutations } from "@/features/files/lib/useFsMutations";
import { baseName, currentDirectory, relativeSegments } from "@/features/files/lib/paths";
import { cn } from "@/lib/utils";

export function BreadcrumbBar() {
  const rootPath = useFilesStore((s) => s.rootPath);
  const selectedPath = useFilesStore((s) => s.selectedPath);
  const selectedKind = useFilesStore((s) => s.selectedKind);
  const select = useFilesStore((s) => s.select);
  const { moveEntries } = useFsMutations();
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const dir = currentDirectory(rootPath, selectedPath, selectedKind);
  const segments = relativeSegments(rootPath, dir);

  const crumbs = [{ name: baseName(rootPath) || "/", path: rootPath }];
  let cur = rootPath;
  for (const seg of segments) {
    cur = `${cur}/${seg}`;
    crumbs.push({ name: seg, path: cur });
  }

  function handleDrop(event: React.DragEvent, dest: string) {
    event.preventDefault();
    setDropTarget(null);
    const raw = event.dataTransfer.getData("text/plain");
    if (!raw) return;
    try {
      const paths: string[] = JSON.parse(raw);
      moveEntries.mutate({ paths, dest });
    } catch {
      return;
    }
  }

  if (!rootPath) return null;

  return (
    <div className="flex h-8 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/70 px-3 font-mono text-xs text-muted-foreground">
      <HardDriveIcon className="size-3 shrink-0" />
      {crumbs.map((crumb, index) => (
        <span key={crumb.path} className="flex shrink-0 items-center gap-1">
          {index > 0 && <ChevronRightIcon className="size-3 shrink-0 text-muted-foreground/50" />}
          <button
            type="button"
            onClick={() => select(index === 0 ? null : crumb.path, index === 0 ? null : "dir")}
            onDragOver={(e) => {
              e.preventDefault();
              setDropTarget(crumb.path);
            }}
            onDragLeave={() => setDropTarget((t) => (t === crumb.path ? null : t))}
            onDrop={(e) => handleDrop(e, crumb.path)}
            className={cn(
              "rounded px-1.5 py-0.5 hover:bg-secondary hover:text-foreground",
              crumb.path === dir && "text-foreground",
              dropTarget === crumb.path && "bg-accent text-foreground",
            )}
          >
            {crumb.name}
          </button>
        </span>
      ))}
    </div>
  );
}
