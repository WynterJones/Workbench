import { toast } from "sonner";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Project, ProjectQuery, ProjectStatus } from "@/lib/types";

export function useProjects(query: ProjectQuery) {
  return useQuery({
    queryKey: ["projects", query],
    queryFn: () => api.listProjects(query),
    placeholderData: (previous) => previous,
  });
}

export function useLibraryProjects(query: ProjectQuery, statusFilter: ProjectStatus | "all") {
  const projectsQuery = useProjects(query);
  const raw = projectsQuery.data ?? [];

  const projects = useMemo(
    () => (statusFilter === "all" ? raw : raw.filter((project) => project.status === statusFilter)),
    [raw, statusFilter]
  );

  const availableTags = useMemo(
    () => Array.from(new Set(raw.flatMap((project) => project.tags))).sort(),
    [raw]
  );

  return { ...projectsQuery, projects, availableTags };
}

export function useLibraryStats() {
  return useQuery({
    queryKey: ["libraryStats"],
    queryFn: () => api.stats(),
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      api.archiveProject(id, archived),
    onSuccess: (_, { id, archived }) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["libraryStats"] });
      queryClient.invalidateQueries({ queryKey: ["shelf-count"] });
      toast.success(archived ? "Project archived" : "Project restored", {
        description: archived
          ? "Find it again on the Archived shelf."
          : "It is back on your shelves.",
      });
    },
    onError: (error) =>
      toast.error("Could not change archive state", {
        description: error instanceof Error ? error.message : String(error),
      }),
  });
}

export function useSetProjectTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tags }: { id: number; tags: string[] }) => api.setTags(id, tags),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.id] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Project> }) =>
      api.updateProject(id, patch),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.setQueryData(["project", project.id], project);
    },
  });
}
