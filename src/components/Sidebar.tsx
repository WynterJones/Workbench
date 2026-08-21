import { Blocks, Boxes, Cpu, Folder, GitBranch, Images, Plug, Plus, Settings, Sparkles } from "lucide-react";
import { NavItem } from "@/components/NavItem";
import { UpdateAvailableButton } from "@/components/UpdateAvailableButton";
import { PluginNavLinks } from "@/features/plugins/PluginNavLinks";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useShelfCounts } from "@/hooks/useShelfCounts";
import { useAppVersion } from "@/hooks/useAppVersion";

export function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const route = useAppStore((s) => s.route);
  const setRoute = useAppStore((s) => s.setRoute);
  const openFiles = useAppStore((s) => s.openFiles);
  const openStarters = useAppStore((s) => s.openStarters);
  const counts = useShelfCounts();
  const version = useAppVersion();

  return (
    <aside
      data-tauri-drag-region
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-150 ease-out motion-reduce:transition-none",
        collapsed ? "w-[72px]" : "w-56",
      )}
    >
      <div
        data-tauri-drag-region
        className={cn(
          "flex h-28 shrink-0 flex-col justify-end pt-14",
          collapsed ? "items-center px-2 pb-3" : "px-3 pb-2.5",
        )}
      >
        <img
          src={collapsed ? "/mark.png" : "/wordmark.png"}
          srcSet={collapsed ? undefined : "/wordmark.png 1x, /wordmark@2x.png 2x"}
          alt="Workbench"
          draggable={false}
          className={cn("select-none", collapsed ? "size-12 -translate-y-2" : "w-full")}
        />
        {!collapsed && (
          <span className="mt-0.5 w-full text-center text-[10px] font-medium tracking-wide text-muted-foreground/70">
            {version ? `v${version}` : ""}
          </span>
        )}
      </div>
      <nav data-tauri-drag-region className="flex flex-1 flex-col gap-0.5 p-2">
        <NavItem
          icon={Boxes}
          label="Projects"
          count={counts.all}
          collapsed={collapsed}
          active={route === "library" || route === "project"}
          onClick={() => setRoute("library")}
        />
        <NavItem icon={Folder} label="Files" collapsed={collapsed} active={route === "files"} onClick={() => openFiles()} />
        <NavItem
          icon={Images}
          label="Media"
          collapsed={collapsed}
          active={route === "media"}
          onClick={() => setRoute("media")}
        />
        <div className="-mx-2 my-1.5 h-0 border-t border-background border-b border-foreground/10" />
        <NavItem icon={Sparkles} label="Skills" collapsed={collapsed} active={route === "skills"} onClick={() => setRoute("skills")} />
        <NavItem icon={Plug} label="MCPs" collapsed={collapsed} active={route === "mcp"} onClick={() => setRoute("mcp")} />
        <NavItem icon={Cpu} label="Models" collapsed={collapsed} active={route === "models"} onClick={() => setRoute("models")} />
        <PluginNavLinks collapsed={collapsed} />
        <NavItem
          icon={Plus}
          label="New Project"
          collapsed={collapsed}
          active={route === "starters"}
          secondary
          onClick={openStarters}
        />
      </nav>
      <div className="px-2 pb-1">
        <UpdateAvailableButton collapsed={collapsed} />
      </div>
      <div className="border-t border-border p-2">
        <NavItem
          icon={GitBranch}
          label="Timeline"
          collapsed={collapsed}
          active={route === "timeline"}
          onClick={() => setRoute("timeline")}
        />
        <NavItem
          icon={Blocks}
          label="Plugins"
          collapsed={collapsed}
          active={route === "plugins"}
          onClick={() => setRoute("plugins")}
        />
        <NavItem
          icon={Settings}
          label="Settings"
          collapsed={collapsed}
          active={route === "settings"}
          onClick={() => setRoute("settings")}
        />
      </div>
    </aside>
  );
}
