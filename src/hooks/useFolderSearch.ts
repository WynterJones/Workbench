import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export interface FolderMatch {
  name: string;
  path: string;
  parent: string;
  isScanRoot: boolean;
}

export function useFolderSearch(query: string, enabled: boolean) {
  return useQuery({
    queryKey: ["folder-search", query],
    queryFn: () => invoke<FolderMatch[]>("search_folders", { query }),
    enabled,
    staleTime: 30_000,
  });
}
