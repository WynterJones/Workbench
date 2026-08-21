import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";
import { filesApi } from "@/lib/filesApi";

export function useFsWatch(path: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unlisten = listen<string>("fs:changed", (event) => {
      const changedPath = event.payload;
      queryClient.invalidateQueries({
        queryKey: ["dir"],
        predicate: (query) => query.queryKey[1] === changedPath,
      });
      queryClient.invalidateQueries({
        queryKey: ["fs-info"],
        predicate: (query) => query.queryKey[1] === changedPath,
      });
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [queryClient]);

  useEffect(() => {
    if (!path) return;
    filesApi.watchDirectory(path).catch(() => {});
    return () => {
      filesApi.unwatchDirectory().catch(() => {});
    };
  }, [path]);
}
