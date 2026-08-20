import { useCallback, useEffect, useRef } from "react";
import { EraserIcon, GripVerticalIcon, PanelBottomIcon, PictureInPicture2Icon, TerminalIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useXterm } from "@/features/terminal/useXterm";
import { useDragResize, type Handle } from "@/features/terminal/useDragResize";
import { clampRect, MAX_HEIGHT, MIN_HEIGHT, useTerminalStore } from "@/lib/terminalStore";
import { truncatePath } from "@/lib/format";
import { cn } from "@/lib/utils";
import "@xterm/xterm/css/xterm.css";

const EDGES: { handle: Handle; className: string }[] = [
  { handle: "n", className: "inset-x-3 -top-1 h-2 cursor-ns-resize" },
  { handle: "s", className: "inset-x-3 -bottom-1 h-2 cursor-ns-resize" },
  { handle: "w", className: "inset-y-3 -left-1 w-2 cursor-ew-resize" },
  { handle: "e", className: "inset-y-3 -right-1 w-2 cursor-ew-resize" },
  { handle: "nw", className: "-left-1 -top-1 size-3 cursor-nwse-resize" },
  { handle: "ne", className: "-right-1 -top-1 size-3 cursor-nesw-resize" },
  { handle: "sw", className: "-bottom-1 -left-1 size-3 cursor-nesw-resize" },
  { handle: "se", className: "-bottom-1 -right-1 size-3 cursor-nwse-resize" },
];

export function TerminalPanel() {
  const open = useTerminalStore((s) => s.open);
  const docked = useTerminalStore((s) => s.docked);
  const rect = useTerminalStore((s) => s.rect);
  const dockedHeight = useTerminalStore((s) => s.dockedHeight);
  const cwd = useTerminalStore((s) => s.cwd);
  const setOpen = useTerminalStore((s) => s.setOpen);
  const setDocked = useTerminalStore((s) => s.setDocked);
  const setRect = useTerminalStore((s) => s.setRect);
  const setDockedHeight = useTerminalStore((s) => s.setDockedHeight);
  const consumePending = useTerminalStore((s) => s.consumePending);

  const container = useRef<HTMLDivElement | null>(null);
  const dockDrag = useRef(false);
  const { run, clear } = useXterm(container, cwd, open);
  const { start } = useDragResize(rect, setRect);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      const command = consumePending();
      if (command) run(command);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [open, cwd, consumePending, run]);

  const onDockMove = useCallback(
    (event: PointerEvent) => {
      if (!dockDrag.current) return;
      setDockedHeight(window.innerHeight - event.clientY);
    },
    [setDockedHeight],
  );

  useEffect(() => {
    function stop() {
      dockDrag.current = false;
      document.body.style.userSelect = "";
    }
    window.addEventListener("pointermove", onDockMove);
    window.addEventListener("pointerup", stop);
    return () => {
      window.removeEventListener("pointermove", onDockMove);
      window.removeEventListener("pointerup", stop);
    };
  }, [onDockMove]);

  function float() {
    setRect(
      clampRect(
        { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
    setDocked(false);
  }

  const style = docked
    ? { height: dockedHeight }
    : { left: rect.x, top: rect.y, width: rect.width, height: rect.height };

  return (
    <section
      aria-label="Terminal"
      className={cn(
        "fixed z-40 flex flex-col overflow-hidden border-border bg-[#0b0b0d]",
        docked
          ? "inset-x-0 bottom-0 border-t"
          : "rounded-xl border shadow-[0_24px_70px_-20px_rgba(0,0,0,0.85)]",
        open ? "visible" : "pointer-events-none invisible",
      )}
      style={style}
    >
      {docked ? (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize terminal"
          tabIndex={0}
          onPointerDown={(event) => {
            event.preventDefault();
            dockDrag.current = true;
            document.body.style.userSelect = "none";
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") setDockedHeight(Math.min(MAX_HEIGHT, dockedHeight + 24));
            if (event.key === "ArrowDown") setDockedHeight(Math.max(MIN_HEIGHT, dockedHeight - 24));
          }}
          className="group absolute inset-x-0 top-0 z-10 h-2 cursor-ns-resize"
        >
          <span className="mx-auto block h-0.5 w-16 translate-y-[3px] rounded-full bg-border transition-colors duration-150 group-hover:bg-brand" />
        </div>
      ) : (
        EDGES.map((edge) => (
          <span
            key={edge.handle}
            onPointerDown={(event) => start(edge.handle, event)}
            className={cn("absolute z-10", edge.className)}
          />
        ))
      )}

      <header
        onPointerDown={(event) => {
          if (docked) return;
          if ((event.target as HTMLElement).closest("button")) return;
          start("move", event);
        }}
        className={cn(
          "flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2",
          docked ? "" : "cursor-grab active:cursor-grabbing",
        )}
      >
        {!docked && (
          <GripVerticalIcon className="size-3.5 shrink-0 text-muted-foreground/50" strokeWidth={1.75} />
        )}
        <TerminalIcon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
          {cwd ? truncatePath(cwd) : "~"}
        </span>

        <Button
          size="icon-sm"
          variant="ghost"
          className="cursor-pointer"
          onClick={() => (docked ? float() : setDocked(true))}
          title={docked ? "Float terminal" : "Dock to bottom"}
        >
          {docked ? (
            <PictureInPicture2Icon className="size-3.5" />
          ) : (
            <PanelBottomIcon className="size-3.5" />
          )}
        </Button>
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
