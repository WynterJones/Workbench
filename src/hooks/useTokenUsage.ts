import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export interface AgentUsage {
  agent: string;
  label: string;
  totalTokens: number;
  weekTokens: number;
  inputTokens: number;
  outputTokens: number;
  sessions: number;
}

export interface UsageReport {
  agents: AgentUsage[];
  totalTokens: number;
  weekTokens: number;
  scannedFiles: number;
}

export function useTokenUsage() {
  return useQuery({
    queryKey: ["token-usage"],
    queryFn: () => invoke<UsageReport>("token_usage"),
    staleTime: 10 * 60_000,
    retry: false,
  });
}
