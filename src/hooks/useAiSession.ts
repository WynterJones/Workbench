import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { AiProvider } from "@/lib/types";

export function useStartAiSession() {
  return useMutation({
    mutationFn: ({ id, provider }: { id: number; provider: AiProvider }) =>
      api.startAiSession(id, provider),
    onError: (error) => {
      toast.error("Failed to start AI session", {
        description: error instanceof Error ? error.message : String(error),
      });
    },
  });
}
