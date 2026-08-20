import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export function useReadme(projectId: number | null) {
  return useQuery({
    queryKey: ["project", projectId, "readme"],
    queryFn: () => invoke<string | null>("project_readme", { projectId }),
    enabled: projectId !== null,
    staleTime: 60_000,
  });
}
