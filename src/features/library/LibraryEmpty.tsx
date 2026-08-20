import { FolderSearchIcon, ScanIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LibraryEmptyProps {
  variant: "never-scanned" | "no-results";
  onScan?: () => void;
  onClearFilters?: () => void;
}

export function LibraryEmpty({ variant, onScan, onClearFilters }: LibraryEmptyProps) {
  if (variant === "never-scanned") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-24 text-center">
        <ScanIcon className="size-8 text-muted-foreground/50" strokeWidth={1.25} />
        <div className="space-y-1">
          <p className="text-sm font-medium">Nothing scanned yet</p>
          <p className="text-sm text-muted-foreground">
            Point Workbench at a folder and it turns into a visual catalog.
          </p>
        </div>
        {onScan && (
          <Button size="sm" onClick={onScan} className="mt-2">
            Scan now
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-24 text-center">
      <FolderSearchIcon className="size-8 text-muted-foreground/50" strokeWidth={1.25} />
      <div className="space-y-1">
        <p className="text-sm font-medium">No projects match this filter</p>
        <p className="text-sm text-muted-foreground">
          Try a different shelf, or clear filters to see everything.
        </p>
      </div>
      {onClearFilters && (
        <Button size="sm" variant="outline" onClick={onClearFilters} className="mt-2">
          Clear filters
        </Button>
      )}
    </div>
  );
}
