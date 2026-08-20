import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PluginSourceRow } from "@/features/plugins/PluginSourceRow";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { usePluginSources } from "@/hooks/usePluginData";
import { useSetPluginSelection } from "@/hooks/usePlugins";
import { authorsFor, selectedSources, toggleAuthor, toggleSource } from "@/lib/pluginSelection";
import type { PluginMeta } from "@/lib/pluginCatalog";

interface PluginSourcePickerProps {
  meta: PluginMeta;
  selected: string[];
}

export function PluginSourcePicker({ meta, selected }: PluginSourcePickerProps) {
  const { data, isLoading, isError, error, refetch, isFetching } = usePluginSources(meta.id, true);
  const save = useSetPluginSelection();

  const sources = selectedSources(selected);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{meta.sourceHint}</p>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => refetch()}
          disabled={isFetching}
          title={`Reload ${meta.sourceLabel.toLowerCase()}`}
          className="cursor-pointer"
        >
          <RefreshCwIcon className={isFetching ? "size-3.5 animate-spin" : "size-3.5"} />
        </Button>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        isEmpty={(data ?? []).length === 0}
        emptyTitle={`No ${meta.sourceLabel.toLowerCase()} found`}
        emptyMessage="The token worked, but nothing came back for this account."
        compact
        skeleton={
          <div className="space-y-1.5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        }
      >
        <div className="max-h-72 space-y-0.5 overflow-y-auto rounded-md border border-border p-1">
          {(data ?? []).map((source) => (
            <PluginSourceRow
              key={source.id}
              pluginId={meta.id}
              source={source}
              checked={sources.includes(source.id)}
              authors={authorsFor(selected, source.id)}
              filterable={Boolean(meta.filterByAuthor)}
              onToggle={() =>
                save.mutate({ id: meta.id, selected: toggleSource(selected, source.id) })
              }
              onToggleAuthor={(author) =>
                save.mutate({ id: meta.id, selected: toggleAuthor(selected, source.id, author) })
              }
            />
          ))}
        </div>
      </QueryState>
    </div>
  );
}
