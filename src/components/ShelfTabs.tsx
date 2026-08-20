import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useShelfCounts } from "@/hooks/useShelfCounts";
import type { ShelfId } from "@/lib/types";

const SHELVES: { id: ShelfId; label: string; explain: string }[] = [
  { id: "all", label: "All", explain: "Every project found on disk, excluding archived ones." },
  { id: "continue", label: "Recent", explain: "Source files changed in the last 14 days." },
  { id: "discovered", label: "New", explain: "First seen by a scan in the last 7 days." },
  { id: "gems", label: "Untouched", explain: "Has a screenshot but no code change in 30+ days." },
  { id: "experiments", label: "Experiments", explain: "Not tagged shipped and not marked dead." },
  { id: "shipped", label: "Shipped", explain: "Status set to shipped, or tagged “shipped”." },
  { id: "attention", label: "Broken", explain: "A run was attempted and failed, or tagged “needs-work”." },
  { id: "dead", label: "Dead", explain: "The folder no longer exists at its recorded path." },
];

export function ShelfTabs() {
  const shelf = useAppStore((s) => s.shelf);
  const setShelf = useAppStore((s) => s.setShelf);
  const counts = useShelfCounts();

  return (
    <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-4 py-2">
      {SHELVES.map((entry) => (
        <Tooltip key={entry.id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setShelf(entry.id)}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-colors duration-150 ease-out",
                shelf === entry.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              {entry.label}
              <span className="font-mono text-[10px] opacity-60">{counts[entry.id] ?? 0}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{entry.explain}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
