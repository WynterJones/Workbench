import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { ScanProgress } from "@/lib/types";

export function useScan() {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const queryClient = useQueryClient();
  const clearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const unlisten = listen<ScanProgress>("scan:progress", (event) => {
      setProgress(event.payload);
      if (event.payload.done) {
        toast.success(`Scan complete — ${event.payload.found} projects found`);
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        queryClient.invalidateQueries({ queryKey: ["roots"] });
        queryClient.invalidateQueries({ queryKey: ["shelf-count"] });
        clearTimer.current = setTimeout(() => setProgress(null), 1500);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, [queryClient]);

  const mutation = useMutation({
    mutationFn: api.startScan,
    onMutate: () => {
      setProgress({ scanned: 0, found: 0, currentPath: "", done: false });
    },
    onError: (error) => {
      toast.error(`Scan failed to start: ${String(error)}`);
      setProgress(null);
    },
  });

  const startScan = useCallback(() => {
    mutation.mutate();
  }, [mutation]);

  return {
    startScan,
    isScanning: progress !== null && !progress.done,
    progress,
  };
}
