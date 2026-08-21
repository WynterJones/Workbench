import { toast } from "sonner";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Project, ProjectQuery, ProjectStatus } from "@/lib/types";

const ALL_PROJECTS_QUERY: ProjectQuery = {
  shelf: "all",
  search: "",
  frameworks: [],
  tags: [],
  sort: "modified",
};

type BulkProjectUpdate =
  | { projects: Project[]; tag: string }
  | { projects: Project[]; status: ProjectStatus };

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

export function useAllProjectTags() {
  const { data } = useProjects(ALL_PROJECTS_QUERY);

  return useMemo(
    () => Array.from(new Set((data ?? []).flatMap((project) => project.tags))).sort(),
    [data],
  );
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
      queryClient.invalidateQueries({ queryKey: ["shelf-count"] });
    },
  });
}

export function useBulkUpdateProjects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: BulkProjectUpdate) => {
      if ("tag" in update) {
        await Promise.all(
          update.projects
            .filter((project) => !project.tags.includes(update.tag))
            .map((project) => api.setTags(project.id, [...project.tags, update.tag])),
        );
        return;
      }
      await Promise.all(
        update.projects
          .filter((project) => project.status !== update.status)
          .map((project) => api.updateProject(project.id, { status: update.status })),
      );
    },
    onSettled: (_data, _error, update) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["shelf-count"] });
      if ("status" in update) queryClient.invalidateQueries({ queryKey: ["libraryStats"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Project> }) =>
      api.updateProject(id, patch),
    onSuccess: (project, { patch }) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.setQueryData(["project", project.id], project);
      queryClient.invalidateQueries({ queryKey: ["project", project.id, "shipScore"] });
      if (patch.status) {
        queryClient.invalidateQueries({ queryKey: ["libraryStats"] });
        queryClient.invalidateQueries({ queryKey: ["shelf-count"] });
      }
    },
  });
}
