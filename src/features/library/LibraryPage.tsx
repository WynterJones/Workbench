import { useMemo, useState } from "react";
import { toast } from "sonner";
import { InsightsBar } from "@/features/library/InsightsBar";
import { ContributionHeatmap } from "@/features/library/ContributionHeatmap";
import { FilterBar } from "@/features/library/FilterBar";
import { ProjectGrid } from "@/features/library/ProjectGrid";
import { useLibraryProjects, useLibraryStats } from "@/hooks/useProjects";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Framework, ProjectQuery, ProjectStatus } from "@/lib/types";

export function LibraryPage() {
  const shelf = useAppStore((state) => state.shelf);
  const search = useAppStore((state) => state.search);
  const frameworks = useAppStore((state) => state.frameworks);
  const tags = useAppStore((state) => state.tags);
  const sort = useAppStore((state) => state.sort);
  const setFrameworks = useAppStore((state) => state.setFrameworks);
  const setTags = useAppStore((state) => state.setTags);
  const setSort = useAppStore((state) => state.setSort);
  const openProject = useAppStore((state) => state.openProject);

  const [status, setStatus] = useState<ProjectStatus | "all">("all");

  const query: ProjectQuery = useMemo(
    () => ({ shelf, search, frameworks, tags, sort }),
    [shelf, search, frameworks, tags, sort]
  );

  const { projects, availableTags, isLoading } = useLibraryProjects(query, status);
  const { data: stats } = useLibraryStats();

  const availableFrameworks = useMemo(
    () => Object.keys(stats?.byFramework ?? {}) as Framework[],
    [stats]
  );

  const hasEverScanned = (stats?.total ?? 0) > 0;
  const hasActiveFilters = frameworks.length > 0 || tags.length > 0 || status !== "all" || search.trim() !== "";

  function clearFilters() {
    setFrameworks([]);
    setTags([]);
    setStatus("all");
  }

  async function handleScan() {
    try {
      await api.startScan();
    } catch (error) {
      toast.error("Failed to start scan", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <div className="space-y-4 px-6 pb-6 pt-4">
      <ContributionHeatmap />
      <InsightsBar />
      <FilterBar
        availableFrameworks={availableFrameworks}
        availableTags={availableTags}
        frameworks={frameworks}
        tags={tags}
        status={status}
        sort={sort}
        onFrameworksChange={setFrameworks}
        onTagsChange={setTags}
        onStatusChange={setStatus}
        onSortChange={setSort}
      />
      <ProjectGrid
        projects={projects}
        isLoading={isLoading}
        hasEverScanned={hasEverScanned}
        hasActiveFilters={hasActiveFilters}
        onOpen={openProject}
        onScan={handleScan}
        onClearFilters={clearFilters}
      />
    </div>
  );
}
