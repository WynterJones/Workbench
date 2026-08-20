import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { explainError } from "@/lib/errorMessage";

export interface PluginState {
  id: string;
  enabled: boolean;
  hasCredential: boolean;
  selected: string[];
}

export function usePlugins() {
  return useQuery({
    queryKey: ["plugins"],
    queryFn: () => invoke<PluginState[]>("list_plugins"),
    staleTime: 30_000,
  });
}

export function usePlugin(id: string): PluginState | undefined {
  const { data } = usePlugins();
  return data?.find((plugin) => plugin.id === id);
}

function usePluginMutation<TVars>(
  command: string,
  build: (vars: TVars) => Record<string, unknown>,
  successMessage?: (vars: TVars) => string,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: TVars) => invoke<PluginState>(command, build(vars)),
    onSuccess: (_state, vars) => {
      client.invalidateQueries({ queryKey: ["plugins"] });
      client.invalidateQueries({ queryKey: ["plugin-items"] });
      if (successMessage) toast.success(successMessage(vars));
    },
    onError: (error) => {
      const explained = explainError(error);
      toast.error(explained.title, { description: explained.message });
    },
  });
}

export function useSetPluginEnabled() {
  return usePluginMutation<{ id: string; enabled: boolean }>("set_plugin_enabled", (vars) => ({
    id: vars.id,
    enabled: vars.enabled,
  }));
}

export function useSetPluginCredential() {
  return usePluginMutation<{ id: string; token: string }>(
    "set_plugin_credential",
    (vars) => ({ id: vars.id, token: vars.token }),
    (vars) => (vars.token ? "Token saved to your Keychain" : "Token removed"),
  );
}

export function useSetPluginSelection() {
  return usePluginMutation<{ id: string; selected: string[] }>("set_plugin_selection", (vars) => ({
    id: vars.id,
    selected: vars.selected,
  }));
}
