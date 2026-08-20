import { ArrowRightIcon } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PluginSourcePicker } from "@/features/plugins/PluginSourcePicker";
import { PluginTokenField } from "@/features/plugins/PluginTokenField";
import { brandByName } from "@/lib/brandIcons";
import { useSetPluginEnabled } from "@/hooks/usePlugins";
import { useAppStore } from "@/lib/store";
import type { PluginState } from "@/hooks/usePlugins";
import type { PluginMeta } from "@/lib/pluginCatalog";

interface PluginCardProps {
  meta: PluginMeta;
  state: PluginState;
}

export function PluginCard({ meta, state }: PluginCardProps) {
  const brand = brandByName(meta.brand);
  const setEnabled = useSetPluginEnabled();
  const openPlugin = useAppStore((s) => s.openPlugin);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
          {brand && <BrandIcon mark={brand} className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{meta.name}</p>
          <p className="text-xs text-muted-foreground">{meta.blurb}</p>
        </div>
        <Switch
          checked={state.enabled}
          onCheckedChange={(enabled) => setEnabled.mutate({ id: meta.id, enabled })}
          aria-label={`Enable ${meta.name}`}
        />
      </CardHeader>

      {state.enabled && (
        <CardContent className="flex flex-col gap-4 border-t border-border pt-4">
          <PluginTokenField meta={meta} hasCredential={state.hasCredential} />

          {state.hasCredential && (
            <>
              <PluginSourcePicker meta={meta} selected={state.selected} />
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground/70">
                  {state.selected.length} selected · shown in the sidebar as {meta.navLabel}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer gap-1.5"
                  disabled={state.selected.length === 0}
                  onClick={() => openPlugin(meta.id)}
                >
                  Open dashboard
                  <ArrowRightIcon className="size-3.5" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
