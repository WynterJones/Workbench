import { CheckIcon } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { agentBrand, agentInitial } from "@/features/models/agentBrands";
import { cn } from "@/lib/utils";
import type { AgentInfo } from "@/hooks/useAgents";

interface AgentTileProps {
  agent: AgentInfo;
  isDefault: boolean;
  onOpen: () => void;
}

export function AgentTile({ agent, isDefault, onOpen }: AgentTileProps) {
  const brand = agentBrand(agent.id);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border p-6 transition-colors duration-150 ease-out",
        agent.installed
          ? "border-border bg-card hover:border-muted-foreground/40"
          : "border-border/60 bg-card/30 hover:border-border",
      )}
    >
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-xl bg-secondary/60 transition-opacity duration-150",
          !agent.installed && "opacity-40 grayscale",
        )}
      >
        {brand ? (
          <BrandIcon mark={brand} className="size-7" />
        ) : (
          <span className="text-xl font-semibold text-muted-foreground">
            {agentInitial(agent.id, agent.vendor)}
          </span>
        )}
      </span>

      <span className="flex min-w-0 flex-col items-center gap-1">
        <span
          className={cn(
            "truncate text-[15px] font-medium",
            agent.installed ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {agent.name}
        </span>
        {agent.installed ? (
          <span className="flex items-center gap-1 text-[11px] text-ok">
            <CheckIcon className="size-3" strokeWidth={3} />
            {isDefault ? "Default" : "Installed"}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground/60">Not installed</span>
        )}
      </span>
    </button>
  );
}
