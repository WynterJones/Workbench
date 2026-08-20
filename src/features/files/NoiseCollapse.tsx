import { useState } from "react";
import { ChevronRightIcon, PackageIcon } from "lucide-react";
import type { FsEntry } from "@/lib/filesApi";
import { formatBytes } from "@/features/files/lib/format";
import { cn } from "@/lib/utils";

interface NoiseCollapseProps {
  entries: FsEntry[];
  onOpen: (entry: FsEntry) => void;
}

export function NoiseCollapse({ entries, onOpen }: NoiseCollapseProps) {
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) return null;

  const totalSize = entries.reduce((sum, e) => sum + e.size, 0);

  return (
    <div className="shrink-0 border-t border-border/60">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="cursor-pointer flex h-7 w-full items-center gap-2 px-2 text-left text-xs text-muted-foreground/70 hover:text-muted-foreground"
      >
        <ChevronRightIcon className={cn("size-3 shrink-0 transition-transform duration-150", expanded && "rotate-90")} />
        <PackageIcon className="size-3.5 shrink-0" />
        <span>
          build artifacts ({entries.length}){totalSize > 0 ? ` · ${formatBytes(totalSize)}` : ""}
        </span>
      </button>
      {expanded && (
        <div className="pb-1">
          {entries.map((entry) => (
            <button
              key={entry.path}
              type="button"
              onDoubleClick={() => onOpen(entry)}
              onClick={() => onOpen(entry)}
              className="cursor-pointer flex h-7 w-full items-center gap-2 pl-7 pr-2 text-left text-xs text-muted-foreground/60 hover:bg-secondary/40 hover:text-muted-foreground"
            >
              <span className="min-w-0 flex-1 truncate">{entry.name}</span>
              <span className="font-mono">{formatBytes(entry.size)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
