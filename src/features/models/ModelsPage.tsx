import { useState } from "react";
import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentTile } from "@/features/models/AgentTile";
import { AgentDetailDialog } from "@/features/models/AgentDetailDialog";
import { useAgents, type AgentInfo } from "@/hooks/useAgents";
import { useSettings, useSaveSettings } from "@/hooks/useSettings";

const DEFAULTABLE = new Set(["claude-code", "codex"]);

export function ModelsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAgents();
  const { data: settings } = useSettings();
  const saveSettings = useSaveSettings();
  const [openAgent, setOpenAgent] = useState<AgentInfo | null>(null);

  const agents = data ?? [];
  const installedCount = agents.filter((agent) => agent.installed).length;
  const sorted = [...agents].sort((a, b) => Number(b.installed) - Number(a.installed));

  return (
    <div className="space-y-5 px-6 pb-8 pt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {data ? `${installedCount} of ${agents.length} agents installed` : "Detecting agents…"}
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-[164px] w-full rounded-xl" />
            ))}
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map((agent) => (
            <AgentTile
              key={agent.id}
              agent={agent}
              isDefault={settings?.aiProvider === agent.id}
              onOpen={() => setOpenAgent(agent)}
            />
          ))}
        </div>
      </QueryState>

      <AgentDetailDialog
        agent={openAgent}
        isDefault={settings?.aiProvider === openAgent?.id}
        canBeDefault={openAgent ? DEFAULTABLE.has(openAgent.id) : false}
        onOpenChange={(open) => !open && setOpenAgent(null)}
        onMakeDefault={() => {
          if (settings && openAgent) {
            saveSettings.mutate({
              ...settings,
              aiProvider: openAgent.id as "claude-code" | "codex",
            });
            setOpenAgent(null);
          }
        }}
      />
    </div>
  );
}
