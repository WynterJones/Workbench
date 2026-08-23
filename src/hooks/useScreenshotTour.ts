import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { useTerminalStore } from "@/lib/terminalStore";
import type { AiProvider } from "@/lib/types";

export interface TourReport {
  ok: boolean;
  shots: number;
  note: string | null;
}

interface TourSession {
  command: string;
  promptPath: string;
  handoffPath: string;
}

export async function startScreenshotTour(id: number, path: string, provider: AiProvider) {
  const session = await invoke<TourSession>("start_screenshot_tour", { id, provider });
  useTerminalStore.getState().openWith(path, session.command);
  return session;
}

export function useTourReport(id: number, waiting: boolean) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["tour", id],
    queryFn: async () => {
      const report = await invoke<TourReport | null>("poll_screenshot_tour", { id });
      await queryClient.invalidateQueries({ queryKey: ["portfolio", id] });
      if (report) {
        await queryClient.invalidateQueries({ queryKey: ["project", id] });
        await queryClient.invalidateQueries({ queryKey: ["projects"] });
      }
      return report;
    },
    enabled: waiting,
    refetchInterval: waiting ? 3000 : false,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
