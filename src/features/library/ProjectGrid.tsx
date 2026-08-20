import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/features/library/ProjectCard";
import { LibrarySkeleton } from "@/features/library/LibrarySkeleton";
import { LibraryEmpty } from "@/features/library/LibraryEmpty";
import type { Project } from "@/lib/types";

const PAGE_SIZE = 120;

interface ProjectGridProps {
  projects: Project[];
  isLoading: boolean;
  hasEverScanned: boolean;
  hasActiveFilters: boolean;
  onOpen: (id: number) => void;
  onScan?: () => void;
  onClearFilters?: () => void;
}

export function ProjectGrid({
  projects,
  isLoading,
  hasEverScanned,
  hasActiveFilters,
  onOpen,
  onScan,
  onClearFilters,
}: ProjectGridProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (isLoading) return <LibrarySkeleton />;

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
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
      >
        {visible.map((project) => (
          <ProjectCard key={project.id} project={project} onOpen={onOpen} />
        ))}
      </div>
      {remaining > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          >
            Show {Math.min(remaining, PAGE_SIZE)} more
          </Button>
        </div>
      )}
    </div>
  );
}
