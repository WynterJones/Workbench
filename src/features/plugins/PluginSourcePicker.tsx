import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckboxDot } from "@/components/CheckboxDot";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { usePluginSources } from "@/hooks/usePluginData";
import { useSetPluginSelection } from "@/hooks/usePlugins";
import type { PluginMeta } from "@/lib/pluginCatalog";

interface PluginSourcePickerProps {
  meta: PluginMeta;
  selected: string[];
}

export function PluginSourcePicker({ meta, selected }: PluginSourcePickerProps) {
  const { data, isLoading, isError, error, refetch, isFetching } = usePluginSources(meta.id, true);
  const save = useSetPluginSelection();

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((entry) => entry !== id)
      : [...selected, id];
    save.mutate({ id: meta.id, selected: next });
  }

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
        <div className="max-h-64 space-y-0.5 overflow-y-auto rounded-md border border-border p-1">
          {(data ?? []).map((source) => (
            <button
              key={source.id}
              type="button"
              onClick={() => toggle(source.id)}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-left transition-colors duration-150 hover:bg-secondary/60"
            >
              <CheckboxDot checked={selected.includes(source.id)} />
              <span className="truncate text-sm text-foreground">{source.name}</span>
              {source.detail && (
                <span className="ml-auto shrink-0 truncate font-mono text-[10px] text-muted-foreground/60">
                  {source.detail}
                </span>
              )}
            </button>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
