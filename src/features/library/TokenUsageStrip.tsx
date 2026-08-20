import { useTokenUsage } from "@/hooks/useTokenUsage";
import { formatTokens } from "@/lib/formatTokens";

export function TokenUsageStrip() {
  const { data, isLoading, isError } = useTokenUsage();

  if (isError) return null;

  if (isLoading) {
    return (
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50">
        reading agent logs…
      </p>
    );
  }

  if (!data || data.agents.length === 0) return null;

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
      <span className="text-muted-foreground">tokens</span>
      {data.agents.map((agent) => (
        <span key={agent.agent}>
          {agent.label}{" "}
          <span className="text-foreground/80">{formatTokens(agent.totalTokens)}</span>
          <span className="text-muted-foreground/50"> / 7d </span>
          <span className="text-foreground/80">{formatTokens(agent.weekTokens)}</span>
        </span>
      ))}
      <span className="text-muted-foreground/50">·</span>
      <span>
        all <span className="text-brand">{formatTokens(data.totalTokens)}</span>
        <span className="text-muted-foreground/50"> / 7d </span>
        <span className="text-brand">{formatTokens(data.weekTokens)}</span>
      </span>
    </p>
  );
}
