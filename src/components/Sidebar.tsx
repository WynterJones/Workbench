import { Settings } from "lucide-react";
import { ShelfNav } from "@/components/ShelfNav";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

export function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const route = useAppStore((s) => s.route);
  const setRoute = useAppStore((s) => s.setRoute);

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-card transition-[width] duration-150 ease-out",
        collapsed ? "w-0 overflow-hidden border-r-0" : "w-60",
      )}
    >
      <div data-tauri-drag-region className="flex h-16 shrink-0 items-end px-4 pb-3 pt-7">
        <span className="text-sm font-bold tracking-[0.1em] text-foreground">WORKBENCH</span>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <ShelfNav />
      </div>
      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={() => setRoute("settings")}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150 ease-out",
            route === "settings"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
          )}
        >
          <Settings className="size-4 shrink-0" strokeWidth={1.75} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
