import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyMessage?: string;
  skeleton?: ReactNode;
  children: ReactNode;
}

export function QueryState({
  isLoading,
  isError,
  error,
  onRetry,
  isEmpty,
  emptyMessage = "Nothing here.",
  skeleton,
  children,
}: QueryStateProps) {
  if (isLoading) {
    return <>{skeleton ?? <Skeleton className="h-16 w-full" />}</>;
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <span>{error instanceof Error ? error.message : String(error ?? "Something went wrong.")}</span>
        {onRetry && (
          <button type="button" onClick={onRetry} className="cursor-pointer underline underline-offset-2">
            Retry
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return <p className="py-2 text-xs text-muted-foreground">{emptyMessage}</p>;
  }

  return <>{children}</>;
}
