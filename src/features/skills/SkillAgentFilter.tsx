import { LayersIcon } from "lucide-react";
import { AgentMarkIcon } from "@/features/models/AgentMarkIcon";
import { cn } from "@/lib/utils";

export type SkillAgentFilterValue = "all" | "claude-code" | "codex";

const AGENTS: { value: SkillAgentFilterValue; label: string; vendor: string }[] = [
  { value: "all", label: "All", vendor: "All" },
  { value: "claude-code", label: "Claude Code", vendor: "Anthropic" },
  { value: "codex", label: "Codex", vendor: "OpenAI" },
];

interface SkillAgentFilterProps {
  value: SkillAgentFilterValue;
  counts: Record<string, number>;
  onChange: (value: SkillAgentFilterValue) => void;
}

export function SkillAgentFilter({ value, counts, onChange }: SkillAgentFilterProps) {
  return (
    <div
      role="tablist"
      aria-label="Filter skills by agent"
      className="flex items-center gap-0.5 rounded-lg border border-border bg-background/60 p-0.5"
    >
      {AGENTS.map((agent) => {
        const active = agent.value === value;
        const count = counts[agent.value] ?? 0;

        return (
          <button
            key={agent.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(agent.value)}
            title={agent.label}
            className={cn(
              "flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[6px] px-2 py-1.5 text-[12px] font-medium transition-colors duration-150 ease-out",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {agent.value === "all" ? (
              <LayersIcon className="size-3.5 shrink-0" strokeWidth={1.75} />
            ) : (
              <AgentMarkIcon
                agentId={agent.value}
                vendor={agent.vendor}
                className="size-3.5 text-current"
              />
            )}
            <span className="truncate">{agent.label}</span>
            <span
              className={cn(
                "shrink-0 font-mono text-[10px] tabular-nums",
                active ? "text-brand" : "text-muted-foreground/50",
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
