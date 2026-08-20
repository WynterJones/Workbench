import { useMemo, useRef, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { useDirectory } from "@/hooks/useDirectory";
import { useFilesStore } from "@/lib/filesStore";
import { useFsMutations } from "@/features/files/lib/useFsMutations";
import { useAddToCart } from "@/features/files/lib/useAddToCart";
import { useJumpToProject } from "@/features/files/lib/useJumpToProject";
import { useVirtualRows } from "@/features/files/lib/useVirtualRows";
import { partitionEntries } from "@/features/files/lib/noise";
import { currentDirectory, joinPath } from "@/features/files/lib/paths";
import { FileRow } from "@/features/files/FileRow";
import { NoiseCollapse } from "@/features/files/NoiseCollapse";
import { TrashConfirmDialog } from "@/features/files/TrashConfirmDialog";
import type { FsSortBy } from "@/lib/filesApi";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 32;
const COLUMNS: { key: FsSortBy; label: string; className: string }[] = [
  { key: "name", label: "Name", className: "flex-1" },
  { key: "size", label: "Size", className: "w-20 text-right" },
  { key: "modified", label: "Modified", className: "w-24 text-right" },
  { key: "kind", label: "Kind", className: "w-16 text-right" },
];

export function ListBrowser() {
  const rootPath = useFilesStore((s) => s.rootPath);
  const selectedPath = useFilesStore((s) => s.selectedPath);
  const selectedKind = useFilesStore((s) => s.selectedKind);
  const select = useFilesStore((s) => s.select);
  const sortBy = useFilesStore((s) => s.sortBy);
  const sortDesc = useFilesStore((s) => s.sortDesc);
  const setSort = useFilesStore((s) => s.setSort);
  const renamingPath = useFilesStore((s) => s.renamingPath);
  const setRenamingPath = useFilesStore((s) => s.setRenamingPath);

  const dir = currentDirectory(rootPath, selectedPath, selectedKind);
  const { data: entries = [] } = useDirectory(dir);
  const { visible, noise } = useMemo(() => partitionEntries(entries), [entries]);

  const containerRef = useRef<HTMLDivElement>(null);
  const { startIndex, endIndex, offsetY, totalHeight, onScroll } = useVirtualRows(containerRef, visible.length, ROW_HEIGHT);
  const rows = visible.slice(startIndex, endIndex);

  const { renameEntry, trashEntries, moveEntries, copyEntries } = useFsMutations();
  const { toggleEntry, has } = useAddToCart();
  const jumpToProject = useJumpToProject();
  const [pendingTrash, setPendingTrash] = useState<string[] | null>(null);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border/70 px-2 text-xs text-muted-foreground">
        {COLUMNS.map((col) => (
          <button
            key={col.key}
            type="button"
            onClick={() => setSort(col.key, sortBy === col.key ? !sortDesc : false)}
            className={cn("flex items-center justify-end gap-1 hover:text-foreground", col.className)}
          >
            {col.key === "name" && <span className="mr-auto">{col.label}</span>}
            {col.key !== "name" && col.label}
            {sortBy === col.key && (sortDesc ? <ArrowDownIcon className="size-3" /> : <ArrowUpIcon className="size-3" />)}
          </button>
        ))}
      </div>
      <div ref={containerRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
        <div style={{ height: totalHeight, position: "relative" }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {rows.map((entry) => (
              <FileRow
                key={entry.path}
                entry={entry}
                selected={selectedPath === entry.path}
                active={selectedPath === entry.path}
                renaming={renamingPath === entry.path}
                inCart={has(entry.path)}
                onSelect={() => select(entry.path, entry.kind)}
                onActivate={() => select(entry.path, entry.kind)}
                onRename={(newName) =>
                  renameEntry.mutate(
                    { path: entry.path, newName },
                    { onSuccess: () => setRenamingPath(null) }
                  )
                }
                onCancelRename={() => setRenamingPath(null)}
                onStartRename={() => setRenamingPath(entry.path)}
                onAddToCart={() => toggleEntry(entry)}
                onTrash={() => setPendingTrash([entry.path])}
                onJumpToProject={entry.projectFramework ? () => jumpToProject(entry.path) : undefined}
                onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify([entry.path]))}
                onDropInto={
                  entry.kind === "dir"
                    ? (e) => {
                        e.preventDefault();
                        const raw = e.dataTransfer.getData("text/plain");
                        if (!raw) return;
                        try {
                          const paths: string[] = JSON.parse(raw);
                          if (paths.includes(entry.path)) return;
                          const mutation = e.altKey ? copyEntries : moveEntries;
                          mutation.mutate({ paths, dest: entry.path });
                        } catch {
                          return;
                        }
                      }
                    : undefined
                }
              />
            ))}
          </div>
        </div>
        <NoiseCollapse entries={noise} onOpen={(entry) => select(joinPath(dir, entry.name), entry.kind)} />
      </div>
      <TrashConfirmDialog
        paths={pendingTrash}
        pending={trashEntries.isPending}
        onOpenChange={(open) => !open && setPendingTrash(null)}
        onConfirm={() => {
          if (!pendingTrash) return;
          trashEntries.mutate(pendingTrash, { onSuccess: () => setPendingTrash(null) });
        }}
      />
    </div>
  );
}
