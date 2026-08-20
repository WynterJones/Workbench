import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export interface MediaItem {
  path: string;
  name: string;
  relative: string;
  kind: "image" | "video";
  extension: string;
  sizeBytes: number;
  modified: string | null;
}

export function useProjectMedia(projectId: number) {
  return useQuery({
    queryKey: ["media", projectId],
    queryFn: () => invoke<MediaItem[]>("project_media", { projectId }),
    staleTime: 60_000,
  });
}

export function useMediaDetails(paths: string[]) {
  return useQuery({
    queryKey: ["media-details", [...paths].sort().join("|")],
    queryFn: () => invoke<MediaItem[]>("media_details", { paths }),
    enabled: paths.length > 0,
    staleTime: 60_000,
  });
}
