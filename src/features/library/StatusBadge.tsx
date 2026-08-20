import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

const STATUS_META: Record<ProjectStatus, { label: string; dot: string; pulse?: boolean }> = {
  unknown: { label: "Unknown", dot: "bg-muted-foreground/50" },
  runnable: { label: "Runnable", dot: "bg-ok" },
  running: { label: "Running", dot: "bg-ok", pulse: true },
  broken: { label: "Broken", dot: "bg-warn" },
  dead: { label: "Dead", dot: "bg-destructive" },
  shipped: { label: "Shipped", dot: "bg-ok" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = STATUS_META[status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex items-center gap-1.5", className)}>
          <span className="relative flex size-1.5">
            {meta.pulse && (
              <span
                className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-75", meta.dot)}
              />
            )}
            <span className={cn("relative inline-flex size-1.5 rounded-full", meta.dot)} />
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{meta.label}</TooltipContent>
    </Tooltip>
  );
}
