import { useCallback, useEffect, useRef } from "react";
import { EraserIcon, TerminalIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useXterm } from "@/features/terminal/useXterm";
import { MAX_HEIGHT, MIN_HEIGHT, useTerminalStore } from "@/lib/terminalStore";
import { truncatePath } from "@/lib/format";
import { cn } from "@/lib/utils";
import "@xterm/xterm/css/xterm.css";

export function TerminalPanel() {
  const open = useTerminalStore((s) => s.open);
  const height = useTerminalStore((s) => s.height);
  const cwd = useTerminalStore((s) => s.cwd);
  const setOpen = useTerminalStore((s) => s.setOpen);
  const setHeight = useTerminalStore((s) => s.setHeight);
  const consumePending = useTerminalStore((s) => s.consumePending);

  const container = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const { run, clear } = useXterm(container, cwd, open);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      const command = consumePending();
      if (command) run(command);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [open, cwd, consumePending, run]);

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragging.current) return;
      setHeight(window.innerHeight - event.clientY);
    },
    [setHeight],
  );

  const stopDrag = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDrag);
    };
  }, [onPointerMove, stopDrag]);

  return (
    <section
      aria-label="Terminal"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex flex-col border-t border-border bg-[#0b0b0d]",
        open ? "visible" : "pointer-events-none invisible",
      )}
      style={{ height: open ? height : MIN_HEIGHT }}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize terminal"
        tabIndex={0}
        onPointerDown={(event) => {
          event.preventDefault();
          dragging.current = true;
          document.body.style.cursor = "ns-resize";
          document.body.style.userSelect = "none";
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") setHeight(Math.min(MAX_HEIGHT, height + 24));
          if (event.key === "ArrowDown") setHeight(Math.max(MIN_HEIGHT, height - 24));
        }}
        className="group absolute inset-x-0 -top-1 z-10 h-2 cursor-ns-resize"
      >
        <span className="mx-auto block h-0.5 w-16 translate-y-[3px] rounded-full bg-border transition-colors duration-150 group-hover:bg-brand" />
      </div>

      <header className="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-3">
        <TerminalIcon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
          {cwd ? truncatePath(cwd) : "~"}
        </span>
        <Button size="icon-sm" variant="ghost" className="cursor-pointer" onClick={clear} title="Clear">
          <EraserIcon className="size-3.5" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          className="cursor-pointer"
          onClick={() => setOpen(false)}
          title="Hide terminal"
        >
          <XIcon className="size-3.5" />
        </Button>
      </header>

      <div ref={container} className="min-h-0 flex-1 px-2 py-1" />
    </section>
  );
}
