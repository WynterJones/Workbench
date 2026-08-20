import { Boxes, Cpu, Folder, Plus, Settings, Sparkles } from "lucide-react";
import { NavItem } from "@/components/NavItem";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useShelfCounts } from "@/hooks/useShelfCounts";

export function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const route = useAppStore((s) => s.route);
  const setRoute = useAppStore((s) => s.setRoute);
  const openFiles = useAppStore((s) => s.openFiles);
  const openStarters = useAppStore((s) => s.openStarters);
  const counts = useShelfCounts();

  return (
    <aside
      data-tauri-drag-region
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-card transition-[width] duration-150 ease-out",
        collapsed ? "w-0 overflow-hidden border-r-0" : "w-56",
      )}
    >
      <div data-tauri-drag-region className="flex h-[96px] shrink-0 items-end px-3 pb-4 pt-14">
        <img
          src="/wordmark.png"
          srcSet="/wordmark.png 1x, /wordmark@2x.png 2x"
          alt="Workbench"
          draggable={false}
          className="w-full select-none"
        />
      </div>
      <nav data-tauri-drag-region className="flex flex-1 flex-col gap-0.5 p-2">
        <NavItem
          icon={Boxes}
          label="Projects"
          count={counts.all}
          active={route === "library" || route === "project"}
          onClick={() => setRoute("library")}
        />
        <NavItem icon={Folder} label="Files" active={route === "files"} onClick={() => openFiles()} />
        <NavItem icon={Sparkles} label="Skills" active={route === "skills"} onClick={() => setRoute("skills")} />
        <NavItem icon={Cpu} label="Models" active={route === "models"} onClick={() => setRoute("models")} />
        <div className="my-1 h-px bg-border" />
        <NavItem
          icon={Plus}
          label="New Project"
          active={route === "starters"}
          onClick={openStarters}
        />
      </nav>
      <div className="border-t border-border p-2">
        <NavItem
          icon={Settings}
          label="Settings"
          active={route === "settings"}
          onClick={() => setRoute("settings")}
        />
      </div>
    </aside>
  );
}
