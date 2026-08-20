import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useProject(id: number | null) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => api.getProject(id as number),
    enabled: id !== null,
  });
}

export function useProjectActivity(id: number | null) {
  return useQuery({
    queryKey: ["project", id, "activity"],
    queryFn: () => api.activity(id as number),
    enabled: id !== null,
  });
}

export function useProjectTodos(id: number | null) {
  return useQuery({
    queryKey: ["project", id, "todos"],
    queryFn: () => api.todos(id as number),
    enabled: id !== null,
  });
}
