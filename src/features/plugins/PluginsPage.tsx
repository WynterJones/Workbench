import { ShieldCheckIcon } from "lucide-react";
import { PluginCard } from "@/features/plugins/PluginCard";
import { Skeleton } from "@/components/ui/skeleton";
import { PLUGIN_CATALOG } from "@/lib/pluginCatalog";
import { usePlugins } from "@/hooks/usePlugins";

export function PluginsPage() {
  const { data, isLoading } = usePlugins();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Plugins</h1>
        <p className="text-sm text-muted-foreground">
          Connect the services you ship with. Enabled plugins get their own sidebar link.
        </p>
      </div>

      <div className="flex items-start gap-2.5 rounded-md border border-border bg-secondary/30 px-3 py-2.5">
        <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-400" />
        <p className="text-xs text-muted-foreground">
          Tokens are stored in your macOS Keychain, never in the Workbench database and never in
          plain text. Workbench only ever reads from these services.
        </p>
      </div>

      {isLoading
        ? PLUGIN_CATALOG.map((meta) => <Skeleton key={meta.id} className="h-24 w-full" />)
        : PLUGIN_CATALOG.map((meta) => {
            const state = data?.find((plugin) => plugin.id === meta.id);
            if (!state) return null;
            return <PluginCard key={meta.id} meta={meta} state={state} />;
          })}
    </div>
  );
}
