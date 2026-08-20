import {
  Hammer,
  Sparkles,
  Radar,
  Rocket,
  FlaskConical,
  AlertTriangle,
  Skull,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useShelfCounts } from "@/hooks/useShelfCounts";
import type { ShelfId } from "@/lib/types";

interface ShelfDef {
  id: ShelfId;
  label: string;
  icon: LucideIcon;
}

const SHELVES: ShelfDef[] = [
  { id: "continue", label: "Continue Building", icon: Hammer },
  { id: "gems", label: "Forgotten Gems", icon: Sparkles },
  { id: "discovered", label: "Recently Discovered", icon: Radar },
  { id: "shipped", label: "Shipped", icon: Rocket },
  { id: "experiments", label: "Experiments", icon: FlaskConical },
  { id: "attention", label: "Needs Attention", icon: AlertTriangle },
  { id: "dead", label: "Dead / Won't Run", icon: Skull },
  { id: "all", label: "All Projects", icon: LayoutGrid },
];

export function ShelfNav() {
  const shelf = useAppStore((s) => s.shelf);
  const route = useAppStore((s) => s.route);
  const setShelf = useAppStore((s) => s.setShelf);
  const counts = useShelfCounts();

  return (
    <nav data-tauri-drag-region className="flex flex-col gap-0.5 px-2">
      {SHELVES.map(({ id, label, icon: Icon }) => {
        const active = route === "library" && shelf === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setShelf(id)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150 ease-out",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.75} />
            <span className="flex-1 truncate text-left">{label}</span>
            <Badge
              variant="outline"
              className="h-5 min-w-5 justify-center px-1 font-mono text-[11px] text-muted-foreground"
            >
              {counts[id]}
            </Badge>
          </button>
        );
      })}
    </nav>
  );
}
