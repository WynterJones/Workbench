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
  sourceId: string | null;
  title: string;
  subtitle: string;
  status: string;
  tone: PluginTone;
  url: string | null;
  timestamp: string | null;
  meta: string | null;
}

export interface PluginItemDetail {
  summary: string;
  frames: string[];
  request: string | null;
  tags: string[];
  occurred: string | null;
}

export function usePluginItemDetail(id: string, itemId: string | null) {
  return useQuery({
    queryKey: ["plugin-item-detail", id, itemId],
    queryFn: () => invoke<PluginItemDetail>("plugin_item_detail", { id, itemId }),
    enabled: Boolean(itemId),
    staleTime: 300_000,
    retry: false,
  });
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

export function usePluginSourceMembers(id: string, source: string | null) {
  return useQuery({
    queryKey: ["plugin-source-members", id, source],
    queryFn: () => invoke<PluginSource[]>("plugin_source_members", { id, source }),
    enabled: Boolean(source),
    staleTime: 600_000,
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
