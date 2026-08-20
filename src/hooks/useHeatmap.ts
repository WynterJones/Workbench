import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export interface HeatmapDay {
  date: string;
  count: number;
}

export interface Heatmap {
  days: HeatmapDay[];
  total: number;
  identities: string[];
  reposScanned: number;
  busiestDay: string | null;
  currentStreak: number;
  longestStreak: number;
}

export function useHeatmap(days = 365) {
  return useQuery({
    queryKey: ["heatmap", days],
    queryFn: () => invoke<Heatmap>("contribution_heatmap", { days }),
    staleTime: 5 * 60_000,
  });
}
