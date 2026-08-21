import { useMemo, useState } from "react";
import { RefreshCwIcon, SettingsIcon } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { PluginItemRow } from "@/features/plugins/PluginItemRow";
import { PluginIssueDialog } from "@/features/plugins/PluginIssueDialog";
import { PluginServicesDialog } from "@/features/plugins/PluginServicesDialog";
import { brandByName } from "@/lib/brandIcons";
import { pluginMeta } from "@/lib/pluginCatalog";
import { usePluginItems } from "@/hooks/usePluginData";
import type { PluginItem } from "@/hooks/usePluginData";
import { usePlugin } from "@/hooks/usePlugins";
import { useAppStore } from "@/lib/store";

export function PluginDashboard() {
  const activePluginId = useAppStore((s) => s.activePluginId);
  const setRoute = useAppStore((s) => s.setRoute);
  const [inspecting, setInspecting] = useState<PluginItem | null>(null);
  const meta = pluginMeta(activePluginId ?? "");
  const state = usePlugin(activePluginId ?? "");
  const ready = Boolean(meta && state?.enabled && state.hasCredential && state.selected.length > 0);
  const { data, isLoading, isError, error, refetch, isFetching } = usePluginItems(
    activePluginId ?? "",
    ready,
  );

  const grouped = useMemo(() => {
    return Object.entries(
      (data ?? []).reduce<Record<string, typeof data>>((acc, item) => {
        (acc[item.source] ??= []).push(item);
        return acc;
      }, {}),
    );
  }, [data]);

  if (!meta) return null;
  const brand = brandByName(meta.brand);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-8">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
          {brand && <BrandIcon mark={brand} className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-foreground">{meta.name}</h1>
          <p className="text-xs text-muted-foreground">{meta.itemsLabel}</p>
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => refetch()}
          disabled={!ready || isFetching}
          title="Refresh"
          className="cursor-pointer"
        >
          <RefreshCwIcon className={isFetching ? "size-3.5 animate-spin" : "size-3.5"} />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="cursor-pointer gap-1.5"
          onClick={() => setRoute("plugins")}
        >
          <SettingsIcon className="size-3.5" />
          Configure
        </Button>
      </div>

      {!ready ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-foreground">Not set up yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Add a token and pick at least one {meta.sourceLabel.toLowerCase().replace(/s$/, "")} to
            start tracking.
          </p>
          <Button
            size="sm"
            className="mt-4 cursor-pointer"
            onClick={() => setRoute("plugins")}
          >
            Configure {meta.name}
          </Button>
        </div>
      ) : (
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={() => refetch()}
          isEmpty={(data ?? []).length === 0}
          emptyTitle="Nothing to show"
          emptyMessage={meta.emptyMessage}
          skeleton={
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          }
        >
          {grouped.map(([source, items]) => (
            <section key={source} className="mb-5">
              <p className="mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                {source}
                <span className="h-px flex-1 bg-border/60" />
                <span className="font-mono text-[10px] text-muted-foreground/50">
                  {items?.length ?? 0}
                </span>
              </p>
              <div className="space-y-1.5">
                {(items ?? []).map((item) => (
                  <PluginItemRow
                    key={item.id}
                    item={item}
                    onInspect={
                      activePluginId === "sentry" || activePluginId === "railway"
                        ? setInspecting
                        : undefined
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </QueryState>
      )}

      {activePluginId === "railway" ? (
        <PluginServicesDialog
          item={inspecting}
          deployments={(data ?? []).filter((item) => item.source === inspecting?.source)}
          onOpenChange={(open) => !open && setInspecting(null)}
        />
      ) : (
        <PluginIssueDialog
          pluginId={activePluginId ?? ""}
          item={inspecting}
          onOpenChange={(open) => !open && setInspecting(null)}
        />
      )}
    </div>
  );
}
