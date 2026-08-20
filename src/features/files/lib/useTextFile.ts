import { useQuery } from "@tanstack/react-query";
import { readTextFile } from "@tauri-apps/plugin-fs";

const MAX_PREVIEW_BYTES = 500_000;

export function useTextFile(path: string | null, size: number | null) {
  const withinLimit = size === null || size <= MAX_PREVIEW_BYTES;

  return useQuery({
    queryKey: ["file-text", path],
    queryFn: () => readTextFile(path as string),
    enabled: Boolean(path) && withinLimit,
    staleTime: 5_000,
  });
}

export function textFileTooLarge(size: number | null): boolean {
  return size !== null && size > MAX_PREVIEW_BYTES;
}
