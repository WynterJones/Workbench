import type { ReactNode } from "react";
import { useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { ShelfTabs } from "@/components/ShelfTabs";
import { CommandPalette } from "@/components/CommandPalette";
import { useAppStore } from "@/lib/store";
import { useTerminalStore } from "@/lib/terminalStore";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const route = useAppStore((s) => s.route);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (meta && event.key === "\\") {
        event.preventDefault();
        toggleSidebar();
      }
      if (meta && event.key === "`") {
        event.preventDefault();
        useTerminalStore.getState().toggle();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar, setCommandPaletteOpen]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        {route === "library" && <ShelfTabs />}
        <main key={route} className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
