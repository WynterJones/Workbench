import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";

export function useRunProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.runProject(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["project", id] });
      const previous = queryClient.getQueryData<Project>(["project", id]);
      if (previous) {
        queryClient.setQueryData<Project>(["project", id], {
          ...previous,
          status: "running",
        });
      }
      return { previous };
    },
    onError: (error, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["project", id], context.previous);
      }
      toast.error("Failed to start project", {
        description: error instanceof Error ? error.message : String(error),
      });
    },
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("Project is running", {
          description: result.url ?? undefined,
        });
      } else {
        toast.error("Project failed to start", {
          description: result.reason ?? result.logTail.slice(0, 200),
        });
      }
    },
    onSettled: (_result, _error, id) => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useStopProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.stopProject(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => {
      toast.error("Failed to stop project", {
        description: error instanceof Error ? error.message : String(error),
      });
    },
  });
}
