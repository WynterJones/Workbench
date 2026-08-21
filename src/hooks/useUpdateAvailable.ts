import { useQuery } from "@tanstack/react-query";
import { check } from "@tauri-apps/plugin-updater";

export function useUpdateAvailable() {
  return useQuery({
    queryKey: ["app-update"],
    queryFn: () => check(),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}
