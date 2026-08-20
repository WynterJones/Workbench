import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { useTerminalStore } from "@/lib/terminalStore";
import type { AiProvider, BrokenReason } from "@/lib/types";

export interface HandoffReport {
  ok: boolean;
  runCommand: string | null;
  url: string | null;
  note: string | null;
}

export interface HandoffOutcome {
  report: HandoffReport;
  captured: boolean;
}

interface RunFixSession {
  command: string;
  promptPath: string;
  handoffPath: string;
}

interface StartRunFix {
  id: number;
  path: string;
  provider: AiProvider;
  reason: BrokenReason | null;
  logTail: string;
}

export async function startRunFix({ id, path, provider, reason, logTail }: StartRunFix) {
  const session = await invoke<RunFixSession>("start_run_fix", { id, provider, reason, logTail });
  useTerminalStore.getState().openWith(path, session.command);
  return session;
}

export function useHandoff(id: number, waiting: boolean) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["handoff", id],
    queryFn: async () => {
      const outcome = await invoke<HandoffOutcome | null>("poll_handoff", { id });
      if (outcome) {
        await queryClient.invalidateQueries({ queryKey: ["project", id] });
        await queryClient.invalidateQueries({ queryKey: ["projects"] });
      }
      return outcome;
    },
    enabled: waiting,
    refetchInterval: waiting ? 3000 : false,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
