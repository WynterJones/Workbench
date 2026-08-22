import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BulkProjectActions } from "@/features/library/BulkProjectActions";
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
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    setVisibleCount(pageSize);
    setSelecting(false);
    setSelectedIds([]);
  }, [pageSize, view]);

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
  const selected = visible.filter((project) => selectedIds.includes(project.id));

  function toggleSelecting() {
    if (selecting) setSelectedIds([]);
    setSelecting(!selecting);
  }

  function toggleProject(id: number) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  }

  return (
    <div className="space-y-4">
      <BulkProjectActions
        selecting={selecting}
        selected={selected}
        visibleCount={visible.length}
        onToggleSelecting={toggleSelecting}
        onSelectVisible={() => setSelectedIds(visible.map((project) => project.id))}
        onClear={() => setSelectedIds([])}
      />
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {visible.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            view={view}
            selectionMode={selecting}
            selected={selectedIds.includes(project.id)}
            onOpen={onOpen}
            onSelect={toggleProject}
          />
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
