import { FileTextIcon, GripVerticalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/features/files/lib/format";
import type { FsEntry } from "@/lib/filesApi";

interface DossierCardProps {
  entry: FsEntry;
  rootPath: string;
  index: number;
  selected: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onSelect: () => void;
  onMove: (offset: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
}

export function DossierCard({
  entry,
  rootPath,
  index,
  selected,
  dragging,
  dropTarget,
  onSelect,
  onMove,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: DossierCardProps) {
  const relative = entry.path.slice(rootPath.length).replace(/^\/+/, "");
  return (
    <article
      className={cn(
        "group relative min-w-0 overflow-hidden border border-brand/20 bg-card/90 shadow-md transition duration-150 ease-out hover:-translate-y-1 hover:border-brand/60 hover:shadow-brand/10 motion-reduce:transform-none motion-reduce:transition-none",
        index % 2 === 0 ? "-rotate-[0.35deg]" : "rotate-[0.35deg]",
        selected && "rotate-0 border-brand bg-brand/10 shadow-brand/15",
        dragging && "scale-[0.98] opacity-45",
        dropTarget && "rotate-0 border-brand ring-2 ring-brand/25",
      )}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-brand/50 opacity-0 transition-opacity group-hover:opacity-100" />
      <button
        type="button"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          onDragOver();
        }}
        onDrop={(event) => {
          event.preventDefault();
          onDrop();
        }}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (!event.shiftKey) return;
          if (event.key === "ArrowLeft") onMove(-1);
          if (event.key === "ArrowRight") onMove(1);
        }}
        aria-pressed={selected}
        className="flex min-h-36 w-full cursor-grab flex-col p-3 text-left outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
      >
        <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-brand/80">
          {String(index + 1).padStart(2, "0")} · {entry.extension}
          <GripVerticalIcon className="size-3.5 text-muted-foreground" />
        </span>
        <FileTextIcon className="my-3 size-7 text-foreground/80 transition-transform group-hover:rotate-[-4deg] motion-reduce:transform-none" strokeWidth={1.25} />
        <strong title={entry.name} className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {entry.name}
        </strong>
        {relative !== entry.name && (
          <span title={relative} className="mt-1 truncate font-mono text-[9px] text-muted-foreground/70">
            {relative}
          </span>
        )}
        <span className="mt-auto pt-2 font-mono text-[10px] text-muted-foreground">
          {formatBytes(entry.size)}
        </span>
      </button>
    </article>
  );
}
