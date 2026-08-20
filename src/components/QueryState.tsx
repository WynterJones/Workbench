import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { EmptyStateBlock } from "@/components/EmptyStateBlock";
import { explainError } from "@/lib/errorMessage";

interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  skeleton?: ReactNode;
  compact?: boolean;
  children: ReactNode;
}

export function QueryState({
  isLoading,
  isError,
  error,
  onRetry,
  isEmpty,
  emptyTitle = "Nothing here yet",
  emptyMessage,
  skeleton,
  compact,
  children,
}: QueryStateProps) {
  if (isLoading) {
    return <>{skeleton ?? <Skeleton className="h-16 w-full" />}</>;
  }

  if (isError) {
    const explained = explainError(error);
    return (
      <ErrorState
        title={explained.title}
        message={explained.message}
        hint={explained.hint}
        onRetry={onRetry}
        compact={compact}
      />
    );
  }

  if (isEmpty) {
    return <EmptyStateBlock title={emptyTitle} message={emptyMessage} compact={compact} />;
  }

  return <>{children}</>;
}
