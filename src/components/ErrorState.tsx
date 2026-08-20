import { AlertTriangleIcon, RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message: string;
  hint?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  hint,
  onRetry,
  compact,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 px-6 text-center",
        compact ? "py-8" : "min-h-[320px] flex-1 py-12",
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full border border-border bg-card">
        <AlertTriangleIcon className="size-5 text-warn" strokeWidth={1.75} />
      </span>
      <div className="max-w-sm space-y-1.5 px-4">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
        {hint && <p className="text-xs leading-relaxed text-muted-foreground/70">{hint}</p>}
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="cursor-pointer">
          <RotateCwIcon />
          Try again
        </Button>
      )}
    </div>
  );
}
