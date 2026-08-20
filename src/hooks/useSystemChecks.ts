import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export interface SystemCheck {
  id: string;
  label: string;
  ok: boolean;
  required: boolean;
  detail: string;
  enables: string;
  fixCommand: string;
  fixUrl: string;
}

export function useSystemChecks() {
  return useQuery({
    queryKey: ["system-checks"],
    queryFn: () => invoke<SystemCheck[]>("system_checks"),
    staleTime: 60_000,
  });
}
