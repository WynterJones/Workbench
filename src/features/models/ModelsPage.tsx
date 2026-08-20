import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentCard } from "@/features/models/AgentCard";
import { useAgents } from "@/hooks/useAgents";
import { useSettings, useSaveSettings } from "@/hooks/useSettings";

const DEFAULTABLE = new Set(["claude-code", "codex"]);

export function ModelsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAgents();
  const { data: settings } = useSettings();
  const saveSettings = useSaveSettings();

  const installed = (data ?? []).filter((agent) => agent.installed);
  const available = (data ?? []).filter((agent) => !agent.installed);

  return (
    <div className="space-y-5 px-6 pb-6 pt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {data ? `${installed.length} of ${data.length} agents installed` : "Detecting agents…"}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="cursor-pointer"
        >
          <RefreshCwIcon className={isFetching ? "animate-spin" : undefined} />
          Re-detect
        </Button>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        skeleton={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-44 w-full" />
            ))}
          </div>
        }
      >
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground">Installed</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {installed.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isDefault={settings?.aiProvider === agent.id}
                onMakeDefault={
                  settings && DEFAULTABLE.has(agent.id)
                    ? () =>
                        saveSettings.mutate({
                          ...settings,
                          aiProvider: agent.id as "claude-code" | "codex",
                        })
                    : undefined
                }
              />
            ))}
          </div>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground">Available</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((agent) => (
              <AgentCard key={agent.id} agent={agent} isDefault={false} />
            ))}
          </div>
        </section>
      </QueryState>
    </div>
  );
}
