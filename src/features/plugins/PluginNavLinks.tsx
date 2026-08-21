import { BrandIcon } from "@/components/BrandIcon";
import { brandByName } from "@/lib/brandIcons";
import { cn } from "@/lib/utils";
import { PLUGIN_CATALOG } from "@/lib/pluginCatalog";
import { usePlugins } from "@/hooks/usePlugins";
import { useAppStore } from "@/lib/store";

export function PluginNavLinks({ collapsed = false }: { collapsed?: boolean }) {
  const { data } = usePlugins();
  const route = useAppStore((s) => s.route);
  const activePluginId = useAppStore((s) => s.activePluginId);
  const openPlugin = useAppStore((s) => s.openPlugin);

  const enabled = PLUGIN_CATALOG.filter((meta) =>
    data?.some((plugin) => plugin.id === meta.id && plugin.enabled),
  );

  if (enabled.length === 0) return null;

  return (
    <div className="-mx-2 my-1 space-y-0.5 border-t border-border bg-background/60 px-2 py-1.5 shadow-inner">
      {enabled.map((meta) => {
        const brand = brandByName(meta.brand);
        const active = route === "plugin" && activePluginId === meta.id;

        return (
          <button
            key={meta.id}
            type="button"
            onClick={() => openPlugin(meta.id)}
            title={collapsed ? meta.navLabel : undefined}
            className={cn(
              "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[15px] font-medium transition-colors duration-150 ease-out",
              collapsed && "justify-center px-0",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            {brand ? (
              <BrandIcon mark={brand} className={collapsed ? "size-5" : "size-[18px]"} monochrome={!active} />
            ) : (
              <span className={cn("shrink-0", collapsed ? "size-5" : "size-[18px]")} />
            )}
            <span className={cn("flex-1 text-left", collapsed && "sr-only")}>{meta.navLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
