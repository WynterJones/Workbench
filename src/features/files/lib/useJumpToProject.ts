import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";

export function useJumpToProject() {
  return async function jumpToProjectByPath(path: string) {
    try {
      const projects = await api.listProjects({
        shelf: "all",
        search: "",
        frameworks: [],
        tags: [],
        sort: "modified",
      });
      const project = projects.find((p) => p.path === path);
      if (!project) {
        toast.error("Not in your library yet", { description: "Scan this folder from Settings first." });
        return;
      }
      useAppStore.getState().openProject(project.id);
    } catch (error) {
      toast.error("Couldn't open project", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
