import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export interface McpServer {
  id: string;
  name: string;
  agent: string;
  scope: "global" | "project";
  project: string | null;
  transport: string;
  command: string | null;
  args: string[];
  url: string | null;
  envKeys: string[];
  source: string;
}

export function useMcpServers() {
  return useQuery({
    queryKey: ["mcp-servers"],
    queryFn: () => invoke<McpServer[]>("list_mcp_servers"),
    staleTime: 60_000,
  });
}
