import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/features/library/ProjectCard";
import { LibrarySkeleton } from "@/features/library/LibrarySkeleton";
import { LibraryEmpty } from "@/features/library/LibraryEmpty";
import type { Project } from "@/lib/types";

interface ProjectGridProps {
  projects: Project[];
  view: "grid" | "list";
  pageSize: number;
  columns: number;
  isLoading: boolean;
  hasEverScanned: boolean;
  hasActiveFilters: boolean;
  onOpen: (id: number) => void;
  onScan?: () => void;
  onClearFilters?: () => void;
}

export function ProjectGrid({
  projects,
  view,
  pageSize,
  columns,
  isLoading,
  hasEverScanned,
  hasActiveFilters,
  onOpen,
  onScan,
  onClearFilters,
}: ProjectGridProps) {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => setVisibleCount(pageSize), [pageSize]);

  if (isLoading) return <LibrarySkeleton view={view} columns={columns} />;

  if (projects.length === 0) {
    return (
      <LibraryEmpty
        variant={hasEverScanned || hasActiveFilters ? "no-results" : "never-scanned"}
        onScan={onScan}
        onClearFilters={hasActiveFilters ? onClearFilters : undefined}
      />
    );
  }

  const visible = projects.slice(0, visibleCount);
  const remaining = projects.length - visible.length;

  return (
    <div className="space-y-4">
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {visible.map((project) => (
          <ProjectCard key={project.id} project={project} view={view} onOpen={onOpen} />
        ))}
      </div>
      {remaining > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((count) => count + pageSize)}
          >
            Show {Math.min(remaining, pageSize)} more
          </Button>
        </div>
      )}
    </div>
  );
}
