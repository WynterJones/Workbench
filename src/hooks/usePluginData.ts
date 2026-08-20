import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export interface PluginSource {
  id: string;
  name: string;
  detail: string | null;
}

export type PluginTone = "good" | "bad" | "warn" | "neutral";

export interface PluginItem {
  id: string;
  source: string;
  title: string;
  subtitle: string;
  status: string;
  tone: PluginTone;
  url: string | null;
  timestamp: string | null;
  meta: string | null;
}

export function usePluginSources(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["plugin-sources", id],
    queryFn: () => invoke<PluginSource[]>("plugin_sources", { id }),
    enabled,
    staleTime: 300_000,
    retry: false,
  });
}

export function usePluginItems(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["plugin-items", id],
    queryFn: () => invoke<PluginItem[]>("plugin_items", { id }),
    enabled,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: false,
  });
}
