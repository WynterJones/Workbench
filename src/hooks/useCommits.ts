import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export interface Commit {
  sha: string;
  shortSha: string;
  summary: string;
  author: string;
  email: string;
  committedAt: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export function useCommits(projectId: number | null, limit = 50) {
  return useQuery({
    queryKey: ["project", projectId, "commits", limit],
    queryFn: () => invoke<Commit[]>("project_commits", { projectId, limit }),
    enabled: projectId !== null,
    retry: false,
    staleTime: 60_000,
  });
}
