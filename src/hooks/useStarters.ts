import { useState } from "react";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";
import { filesApi } from "@/lib/filesApi";

const STARTERS_KEY = ["starters"];

export function useStarters() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: STARTERS_KEY, queryFn: filesApi.listStarters });

  const scaffold = useMutation({
    mutationFn: ({
      starterId,
      parentDir,
      projectName,
      confirmed,
    }: {
      starterId: string;
      parentDir: string;
      projectName: string;
      confirmed: boolean;
    }) => filesApi.scaffoldStarter(starterId, parentDir, projectName, confirmed),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`${result.projectPath} scaffolded`);
        queryClient.invalidateQueries({ queryKey: ["dir"] });
      } else {
        toast.error(result.message ?? "Scaffold failed");
      }
    },
    onError: (error) => {
      toast.error("Scaffold failed", { description: error instanceof Error ? error.message : String(error) });
    },
  });

  const saveFolderAsStarter = useMutation({
    mutationFn: ({ path, name }: { path: string; name: string }) =>
      filesApi.saveFolderAsStarter(path, name),
    onSuccess: () => {
      toast.success("Saved as starter");
      queryClient.invalidateQueries({ queryKey: STARTERS_KEY });
    },
  });

  const deleteStarter = useMutation({
    mutationFn: (starterId: string) => filesApi.deleteStarter(starterId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STARTERS_KEY }),
  });

  return {
    starters: query.data ?? [],
    isLoading: query.isLoading,
    scaffold,
    saveFolderAsStarter,
    deleteStarter,
  };
}

export function useScaffoldProgress(active: boolean) {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (!active) return;
    setLines([]);
    const unlisten = listen<string>("scaffold:progress", (event) => {
      setLines((prev) => [...prev, event.payload]);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [active]);

  return lines;
}
