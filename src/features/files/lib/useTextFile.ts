import { useQuery } from "@tanstack/react-query";
import { filesApi } from "@/lib/filesApi";

const MAX_PREVIEW_BYTES = 2_000_000;

export function useTextFile(path: string | null, size: number | null) {
  const withinLimit = size === null || size <= MAX_PREVIEW_BYTES;

  return useQuery({
    queryKey: ["file-text", path],
    queryFn: async () => {
      const result = await filesApi.readFile(path as string, MAX_PREVIEW_BYTES);
      if (result.kind === "binary") throw new Error("binary");
      return result.text ?? "";
    },
    enabled: Boolean(path) && withinLimit,
    staleTime: 30_000,
    retry: false,
  });
}

export function textFileTooLarge(size: number | null): boolean {
  return size !== null && size > MAX_PREVIEW_BYTES;
}
