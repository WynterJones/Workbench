import type { LucideIcon } from "lucide-react";
import { InboxIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateBlockProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  compact?: boolean;
  action?: React.ReactNode;
}

export function EmptyStateBlock({
  icon: Icon = InboxIcon,
  title,
  message,
  compact,
  action,
}: EmptyStateBlockProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 px-6 text-center",
        compact ? "py-8" : "min-h-[280px] flex-1 py-12",
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full border border-border bg-card">
        <Icon className="size-5 text-muted-foreground" strokeWidth={1.5} />
      </span>
      <div className="max-w-md space-y-1.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {message && <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>}
      </div>
      {action}
    </div>
  );
}
