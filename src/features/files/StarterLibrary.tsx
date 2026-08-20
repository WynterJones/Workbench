import { useMemo, useState } from "react";
import { ArrowLeftIcon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStarters } from "@/hooks/useStarters";
import { useFilesStore } from "@/lib/filesStore";
import { StarterCard } from "@/features/files/StarterCard";
import { ScaffoldDialog } from "@/features/files/ScaffoldDialog";
import { currentDirectory } from "@/features/files/lib/paths";
import { cn } from "@/lib/utils";
import type { StarterTemplate } from "@/lib/filesApi";

export function StarterLibrary() {
  const { starters, isLoading } = useStarters();
  const setMode = useFilesStore((s) => s.setMode);
  const rootPath = useFilesStore((s) => s.rootPath);
  const selectedPath = useFilesStore((s) => s.selectedPath);
  const selectedKind = useFilesStore((s) => s.selectedKind);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [active, setActive] = useState<StarterTemplate | null>(null);

  const categories = useMemo(() => Array.from(new Set(starters.map((s) => s.category))).sort(), [starters]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return starters.filter((starter) => {
      if (category && starter.category !== category) return false;
      if (!query) return true;
      return (
        starter.name.toLowerCase().includes(query) ||
        starter.description.toLowerCase().includes(query) ||
        starter.stack.some((tech) => tech.toLowerCase().includes(query)) ||
        starter.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [starters, search, category]);

  const parentDir = currentDirectory(rootPath, selectedPath, selectedKind) || rootPath;

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <Button variant="ghost" size="icon-sm" onClick={() => setMode("browse")}>
          <ArrowLeftIcon />
        </Button>
        <span className="text-sm font-semibold">Starter Library</span>
        <div className="relative ml-4 max-w-md flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search starters, stacks, tags…"
            className="pl-8"
            autoFocus
          />
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-border px-4 py-2.5">
        <Badge
          variant={category === null ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setCategory(null)}
        >
          All
        </Badge>
        {categories.map((cat) => (
          <Badge
            key={cat}
            variant={category === cat ? "default" : "outline"}
            className={cn("cursor-pointer capitalize")}
            onClick={() => setCategory(cat === category ? null : cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {isLoading && <div className="text-xs text-muted-foreground">Loading starters…</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="text-xs text-muted-foreground">No starters match.</div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((starter) => (
            <StarterCard key={starter.id} starter={starter} onSelect={() => setActive(starter)} />
          ))}
        </div>
      </div>

      <ScaffoldDialog starter={active} parentDir={parentDir} onOpenChange={(open) => !open && setActive(null)} />
    </div>
  );
}
