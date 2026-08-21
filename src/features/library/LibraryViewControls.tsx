import { LayoutGridIcon, ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LibraryViewControlsProps {
  view: "grid" | "list";
  pageSize: number;
  columns: number;
  onViewChange: (view: "grid" | "list") => void;
  onPageSizeChange: (pageSize: number) => void;
  onColumnsChange: (columns: number) => void;
}

export function LibraryViewControls({
  view,
  pageSize,
  columns,
  onViewChange,
  onPageSizeChange,
  onColumnsChange,
}: LibraryViewControlsProps) {
  const columnOptions = view === "grid" ? [2, 3, 4, 5, 6, 7, 8] : [1, 2, 3];

  return (
    <div className="ml-auto flex items-center gap-2">
      <div role="group" aria-label="Project view" className="flex rounded-md border border-input bg-background">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Grid view"
          aria-pressed={view === "grid"}
          title="Grid view"
          onClick={() => onViewChange("grid")}
          className="rounded-r-none aria-pressed:bg-secondary aria-pressed:text-foreground"
        >
          <LayoutGridIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="List view"
          aria-pressed={view === "list"}
          title="List view"
          onClick={() => onViewChange("list")}
          className="rounded-l-none aria-pressed:bg-secondary aria-pressed:text-foreground"
        >
          <ListIcon />
        </Button>
      </div>

      <Select value={String(columns)} onValueChange={(value) => onColumnsChange(Number(value))}>
        <SelectTrigger size="sm" className="w-32" aria-label="Project columns">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {columnOptions.map((count) => (
            <SelectItem key={count} value={String(count)}>
              {count} column{count === 1 ? "" : "s"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <label htmlFor="library-page-size" className="text-xs text-muted-foreground">
        Show
      </label>
      <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
        <SelectTrigger id="library-page-size" size="sm" className="w-32" aria-label="Projects shown at once">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {[12, 24, 48, 120].map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size} at once
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
