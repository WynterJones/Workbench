import { AGENT_MARKS } from "@/features/models/agentMarks";
import { agentInitial } from "@/features/models/agentBrands";
import { cn } from "@/lib/utils";

interface AgentMarkIconProps {
  agentId: string;
  vendor: string;
  className?: string;
}

export function AgentMarkIcon({ agentId, vendor, className }: AgentMarkIconProps) {
  const mark = AGENT_MARKS[agentId];

  if (!mark) {
    return (
      <span className={cn("font-semibold text-muted-foreground", className)}>
        {agentInitial(agentId, vendor)}
      </span>
    );
  }

  return (
    <svg
      role="img"
      viewBox={mark.viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={cn("shrink-0", className)}
      fill="currentColor"
      dangerouslySetInnerHTML={{ __html: mark.svg }}
    />
  );
}
