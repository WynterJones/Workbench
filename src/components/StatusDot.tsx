import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/types";

const STATUS_COLOR: Record<ProjectStatus, string> = {
  unknown: "bg-muted-foreground/40",
  runnable: "bg-muted-foreground",
  running: "bg-ok",
  "in-progress": "bg-brand",
  broken: "bg-destructive",
  dead: "bg-destructive/50",
  shipped: "bg-ok",
};

interface StatusDotProps {
  status: ProjectStatus;
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      role="img"
      aria-label={`status: ${status}`}
      title={status}
      className={cn("inline-block size-2 shrink-0 rounded-full", STATUS_COLOR[status], className)}
    />
  );
}
