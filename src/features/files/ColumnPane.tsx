import { useEffect, useMemo, useRef } from "react";
import { useDirectory } from "@/hooks/useDirectory";
import { useFilesStore } from "@/lib/filesStore";
import { useFsMutations } from "@/features/files/lib/useFsMutations";
import { useAddToCart } from "@/features/files/lib/useAddToCart";
import { useJumpToProject } from "@/features/files/lib/useJumpToProject";
import { useVirtualRows } from "@/features/files/lib/useVirtualRows";
import { partitionEntries } from "@/features/files/lib/noise";
import { FileRow } from "@/features/files/FileRow";
import { NoiseCollapse } from "@/features/files/NoiseCollapse";
import type { FsEntry } from "@/lib/filesApi";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 32;

interface ColumnPaneProps {
  dir: string;
  paneIndex: number;
  highlightName: string | null;
  focused: boolean;
  onSelectEntry: (entry: FsEntry) => void;
  onFocusPane: () => void;
  onRequestTrash: (paths: string[]) => void;
}

export function ColumnPane({
  dir,
  paneIndex,
  highlightName,
  focused,
  onSelectEntry,
  onFocusPane,
  onRequestTrash,
}: ColumnPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: entries = [], isLoading } = useDirectory(dir);
  const { visible, noise } = useMemo(() => partitionEntries(entries), [entries]);
  const { startIndex, endIndex, offsetY, totalHeight, onScroll } = useVirtualRows(
    containerRef,
    visible.length,
    ROW_HEIGHT
  );
  const rows = visible.slice(startIndex, endIndex);

  const renamingPath = useFilesStore((s) => s.renamingPath);
  const setRenamingPath = useFilesStore((s) => s.setRenamingPath);
  const select = useFilesStore((s) => s.select);
  const { renameEntry, moveEntries, copyEntries } = useFsMutations();
  const { toggleEntry, has } = useAddToCart();
  const jumpToProject = useJumpToProject();

  useEffect(() => {
    if (!highlightName || !containerRef.current) return;
    const index = visible.findIndex((e) => e.name === highlightName);
    if (index === -1) return;
    const el = containerRef.current;
    const top = index * ROW_HEIGHT;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + ROW_HEIGHT > el.scrollTop + el.clientHeight) el.scrollTop = top - el.clientHeight + ROW_HEIGHT;
  }, [highlightName, visible]);

  function handleDropInto(event: React.DragEvent, destPath: string) {
    event.preventDefault();
    const raw = event.dataTransfer.getData("text/plain");
    if (!raw) return;
    let paths: string[] = [];
    try {
      paths = JSON.parse(raw);
    } catch {
      return;
    }
    if (paths.includes(destPath)) return;
    const mutation = event.altKey ? copyEntries : moveEntries;
    mutation.mutate({ paths, dest: destPath });
  }

  return (
    <div
      className={cn(
        "flex h-full w-72 shrink-0 flex-col border-r border-border/70",
        focused && "bg-secondary/10",
      )}
      onClick={onFocusPane}
    >
      <div
        ref={containerRef}
        role="listbox"
        onScroll={onScroll}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDropInto(e, dir)}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {isLoading && visible.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground">Loading…</div>
        ) : visible.length === 0 && noise.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground">Empty</div>
        ) : (
          <div style={{ height: totalHeight, position: "relative" }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {rows.map((entry) => (
                <FileRow
                  key={entry.path}
                  entry={entry}
                  selected={entry.name === highlightName}
                  active={focused && entry.name === highlightName}
                  renaming={renamingPath === entry.path}
                  inCart={has(entry.path)}
                  onSelect={() => {
                    onFocusPane();
                    onSelectEntry(entry);
                  }}
                  onActivate={() => {
                    onFocusPane();
                    onSelectEntry(entry);
                  }}
                  onRename={(newName) => {
                    renameEntry.mutate(
                      { path: entry.path, newName },
                      {
                        onSuccess: () => {
                          setRenamingPath(null);
                          if (entry.name === highlightName) {
                            const next = `${dir}/${newName}`;
                            select(next, entry.kind);
                          }
                        },
                      }
                    );
                  }}
                  onCancelRename={() => setRenamingPath(null)}
                  onStartRename={() => setRenamingPath(entry.path)}
                  onAddToCart={() => toggleEntry(entry)}
                  onTrash={() => onRequestTrash([entry.path])}
                  onJumpToProject={entry.projectFramework ? () => jumpToProject(entry.path) : undefined}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify([entry.path]))}
                  onDropInto={entry.kind === "dir" ? (e) => handleDropInto(e, entry.path) : undefined}
                />
              ))}
            </div>
          </div>
        )}
        <NoiseCollapse entries={noise} onOpen={(entry) => onSelectEntry(entry)} />
      </div>
      <div className="shrink-0 border-t border-border/50 px-2 py-1 font-mono text-[10px] text-muted-foreground/60">
        {`${paneIndex}`.padStart(2, "0")} · {entries.length} items
      </div>
    </div>
  );
}
