import { useEffect, useRef } from "react";
import { Command, PanelLeftClose, PanelLeftOpen, Search, TerminalIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScanButton } from "@/components/ScanButton";
import { Button } from "@/components/ui/button";
import { useTerminalStore } from "@/lib/terminalStore";
import { useAppStore } from "@/lib/store";

export function TopBar() {
  const search = useAppStore((s) => s.search);
  const setSearch = useAppStore((s) => s.setSearch);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="sticky top-0 z-10 flex flex-col border-b border-border bg-background/95 backdrop-blur">
      <div data-tauri-drag-region className="flex h-16 shrink-0 items-center gap-3 px-4">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!sidebarCollapsed}
          onClick={toggleSidebar}
          className="shrink-0 cursor-pointer"
          title={`${sidebarCollapsed ? "Expand" : "Collapse"} sidebar (⌘\\)`}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
        </Button>
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects, paths, frameworks…"
            className="pl-8 pr-8"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border px-1 font-mono text-[10px] text-muted-foreground">
            /
          </kbd>
        </div>
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors duration-150 ease-out hover:bg-secondary/60 hover:text-foreground md:flex"
        >
          <Command className="size-3.5" />
          <span>K</span>
        </button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          onClick={() => useTerminalStore.getState().toggle()}
          className="cursor-pointer"
          title="Toggle terminal (⌘`)"
        >
          <TerminalIcon />
          Terminal
        </Button>
        <ScanButton />
      </div>
    </div>
  );
}
