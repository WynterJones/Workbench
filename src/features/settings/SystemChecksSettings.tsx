import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { SystemCheckRow } from "@/features/intro/SystemCheckRow";
import { useSystemChecks } from "@/hooks/useSystemChecks";

export function SystemChecksSettings() {
  const { data, isLoading, isError, error, refetch } = useSystemChecks();

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium text-foreground">System</h2>
        <p className="text-xs text-muted-foreground">
          Optional tools. Workbench runs without them, but each one unlocks a feature.
        </p>
      </div>
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        compact
        skeleton={
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        }
      >
        <ul className="space-y-2">
          {(data ?? []).map((check) => (
            <SystemCheckRow key={check.id} check={check} />
          ))}
        </ul>
      </QueryState>
    </section>
  );
}
