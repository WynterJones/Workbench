import { useMemo } from "react";
import { toast } from "sonner";
import { InsightsBar } from "@/features/library/InsightsBar";
import { ContributionHeatmap } from "@/features/library/ContributionHeatmap";
import { TokenUsageStrip } from "@/features/library/TokenUsageStrip";
import { FilterBar } from "@/features/library/FilterBar";
import { ProjectGrid } from "@/features/library/ProjectGrid";
import { useLibraryProjects, useLibraryStats } from "@/hooks/useProjects";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useUserPreferences } from "@/lib/userPreferences";
import type { Framework, ProjectQuery } from "@/lib/types";

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

  const status = useUserPreferences((state) => state.libraryStatus);
  const setStatus = useUserPreferences((state) => state.setLibraryStatus);
  const view = useUserPreferences((state) => state.libraryView);
  const pageSize = useUserPreferences((state) => state.libraryPageSize);
  const gridColumns = useUserPreferences((state) => state.libraryGridColumns);
  const listColumns = useUserPreferences((state) => state.libraryListColumns);
  const setView = useUserPreferences((state) => state.setLibraryView);
  const setPageSize = useUserPreferences((state) => state.setLibraryPageSize);
  const setColumns = useUserPreferences((state) => state.setLibraryColumns);
  const columns = view === "grid" ? gridColumns : listColumns;

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
      <TokenUsageStrip />
      <FilterBar
        availableFrameworks={availableFrameworks}
        availableTags={availableTags}
        frameworks={frameworks}
        tags={tags}
        status={status}
        sort={sort}
        view={view}
        pageSize={pageSize}
        columns={columns}
        onFrameworksChange={setFrameworks}
        onTagsChange={setTags}
        onStatusChange={setStatus}
        onSortChange={setSort}
        onViewChange={setView}
        onPageSizeChange={setPageSize}
        onColumnsChange={(value) => setColumns(view, value)}
      />
      <ProjectGrid
        projects={projects}
        view={view}
        pageSize={pageSize}
        columns={columns}
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
