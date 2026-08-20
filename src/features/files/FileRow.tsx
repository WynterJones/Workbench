import { useEffect, useRef, useState } from "react";
import { ArrowUpRightIcon, PlusIcon, Trash2Icon } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Badge } from "@/components/ui/badge";
import type { FsEntry } from "@/lib/filesApi";
import { formatBytes, formatModified, gitGutterColor } from "@/features/files/lib/format";
import { iconForEntry } from "@/features/files/lib/icons";
import { cn } from "@/lib/utils";

interface FileRowProps {
  entry: FsEntry;
  selected: boolean;
  active: boolean;
  renaming: boolean;
  inCart: boolean;
  onSelect: (event: React.MouseEvent) => void;
  onActivate: () => void;
  onRename: (newName: string) => void;
  onCancelRename: () => void;
  onStartRename: () => void;
  onAddToCart: () => void;
  onTrash: () => void;
  onJumpToProject?: () => void;
  showMeta?: boolean;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  onDropInto?: (event: React.DragEvent) => void;
}

export function FileRow({
  entry,
  selected,
  active,
  renaming,
  inCart,
  onSelect,
  onActivate,
  onRename,
  onCancelRename,
  onStartRename,
  onAddToCart,
  onTrash,
  onJumpToProject,
  showMeta = true,
  draggable = true,
  onDragStart,
  onDropInto,
}: FileRowProps) {
  const Icon = iconForEntry(entry);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  function submitRename() {
    const value = inputRef.current?.value.trim();
    if (value && value !== entry.name) onRename(value);
    else onCancelRename();
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="option"
          aria-selected={selected}
          draggable={draggable && !renaming}
          onDragStart={onDragStart}
          onDragOver={(event) => {
            if (entry.kind !== "dir" || !onDropInto) return;
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            setDragOver(false);
            onDropInto?.(event);
          }}
          onClick={onSelect}
          onDoubleClick={onActivate}
          className={cn(
            "group relative flex h-8 shrink-0 cursor-pointer select-none items-center gap-2 border-l-2 border-transparent px-2 text-sm transition-colors duration-100",
            entry.gitStatus === "ignored" && "opacity-45",
            selected || active ? "bg-secondary text-foreground" : "text-foreground/90 hover:bg-secondary/50",
            dragOver && "bg-accent/60",
          )}
          style={{ borderLeftColor: gitGutterColor(entry.gitStatus) }}
        >
          <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          {renaming ? (
            <input
              ref={inputRef}
              defaultValue={entry.name}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename();
                if (e.key === "Escape") onCancelRename();
              }}
              onBlur={submitRename}
              className="h-6 min-w-0 flex-1 rounded border border-ring bg-background px-1 text-sm outline-none"
              autoFocus
            />
          ) : (
            <span className="min-w-0 flex-1 truncate">{entry.name}</span>
          )}
          {entry.projectFramework && (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {entry.projectFramework}
            </Badge>
          )}
          {!renaming && showMeta && (
            <span className="hidden shrink-0 items-center gap-3 font-mono text-[11px] text-muted-foreground group-hover:invisible sm:flex">
              {entry.kind === "dir" ? "" : formatBytes(entry.size)}
              <span className="w-16 text-right">{formatModified(entry.modified)}</span>
            </span>
          )}
          {!renaming && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart();
              }}
              className={cn(
                "absolute right-2 hidden shrink-0 cursor-pointer items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-foreground transition-colors duration-150 ease-out hover:bg-accent group-hover:flex",
                inCart && "flex bg-brand/15 text-brand hover:bg-brand/25",
              )}
            >
              <PlusIcon className="size-3" />
              {inCart ? "In context" : "Add to Context"}
            </button>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={onActivate}>Open</ContextMenuItem>
        <ContextMenuItem onSelect={onStartRename}>Rename</ContextMenuItem>
        <ContextMenuItem onSelect={onAddToCart}>
          {inCart ? "Remove from context" : "Add to context"}
        </ContextMenuItem>
        {entry.projectFramework && onJumpToProject && (
          <ContextMenuItem onSelect={onJumpToProject}>
            <ArrowUpRightIcon />
            Open in Workbench
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={onTrash}>
          <Trash2Icon />
          Move to Trash
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
