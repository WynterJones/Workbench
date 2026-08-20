import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export interface Snippet {
  file: string;
  language: string;
  lines: string[];
}

export function useSnippet(projectId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["snippet", projectId],
    queryFn: () => invoke<Snippet | null>("project_snippet", { projectId }),
    enabled,
    staleTime: 30 * 60_000,
    retry: false,
  });
}
