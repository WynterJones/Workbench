import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export interface AgentInfo {
  id: string;
  name: string;
  vendor: string;
  binary: string;
  installed: boolean;
  path: string | null;
  version: string | null;
  configDir: string | null;
  configExists: boolean;
  installUrl: string;
  docsUrl: string;
  installCommand: string;
  description: string;
}

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: () => invoke<AgentInfo[]>("detect_agents"),
    staleTime: 60_000,
  });
}
