import { ImageIcon, LayoutGridIcon, ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GalleryView, MediaKindFilter, MediaSort } from "@/lib/userPreferences";

interface MediaToolbarProps {
  shown: number;
  total: number;
  view: GalleryView;
  columns: number;
  pageSize: number;
  kind: MediaKindFilter;
  sort: MediaSort;
  onViewChange: (view: GalleryView) => void;
  onColumnsChange: (columns: number) => void;
  onPageSizeChange: (size: number) => void;
  onKindChange: (kind: MediaKindFilter) => void;
  onSortChange: (sort: MediaSort) => void;
}

export function MediaToolbar({
  shown,
  total,
  view,
  columns,
  pageSize,
  kind,
  sort,
  onViewChange,
  onColumnsChange,
  onPageSizeChange,
  onKindChange,
  onSortChange,
}: MediaToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/40 p-2">
      <p className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <ImageIcon className="size-3.5" />
        <span className="font-semibold tabular-nums text-foreground">{shown}</span>
        of {total} files
      </p>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Select value={kind} onValueChange={(value) => onKindChange(value as MediaKindFilter)}>
          <SelectTrigger size="sm" className="w-28" aria-label="Media type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All media</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(value) => onSortChange(value as MediaSort)}>
          <SelectTrigger size="sm" className="w-36" aria-label="Media sort order">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="modified">Last modified</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="size">File size</SelectItem>
          </SelectContent>
        </Select>

        <div role="group" aria-label="Media view" className="flex rounded-md border border-input bg-background">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            onClick={() => onViewChange("grid")}
            className="rounded-r-none aria-pressed:bg-secondary"
          >
            <LayoutGridIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => onViewChange("list")}
            className="rounded-l-none aria-pressed:bg-secondary"
          >
            <ListIcon />
          </Button>
        </div>

        {view === "grid" && (
          <Select value={String(columns)} onValueChange={(value) => onColumnsChange(Number(value))}>
            <SelectTrigger size="sm" className="w-32" aria-label="Media grid columns">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {[2, 3, 4, 5, 6, 7, 8].map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {count} columns
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger size="sm" className="w-36" aria-label="Media shown per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {[12, 24, 48, 96].map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} per page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
