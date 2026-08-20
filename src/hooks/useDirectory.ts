import { useQuery } from "@tanstack/react-query";
import { filesApi } from "@/lib/filesApi";
import { useFilesStore } from "@/lib/filesStore";

export function useDirectory(path: string | null) {
  const showHidden = useFilesStore((s) => s.showHidden);
  const sortBy = useFilesStore((s) => s.sortBy);
  const sortDesc = useFilesStore((s) => s.sortDesc);

  return useQuery({
    queryKey: ["dir", path, showHidden, sortBy, sortDesc],
    queryFn: () => filesApi.listDir(path as string, { showHidden, sortBy, sortDesc }),
    enabled: Boolean(path),
    placeholderData: (previous) => previous,
  });
}

export function useEntryInfo(path: string | null) {
  return useQuery({
    queryKey: ["fs-info", path],
    queryFn: () => filesApi.getInfo(path as string),
    enabled: Boolean(path),
  });
}
