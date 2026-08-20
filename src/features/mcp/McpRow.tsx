import { cn } from "@/lib/utils";
import type { McpServer } from "@/hooks/useMcpServers";

interface McpRowProps {
  server: McpServer;
  selected: boolean;
  onSelect: () => void;
}

export function McpRow({ server, selected, onSelect }: McpRowProps) {
  const summary = server.url ?? server.command ?? "no command recorded";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "cursor-pointer rounded-md px-2.5 py-2 transition-colors duration-150 ease-out",
        selected ? "bg-secondary" : "hover:bg-secondary/60",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-medium text-foreground">{server.name}</span>
        {server.scope === "project" && (
          <span className="shrink-0 rounded border border-border px-1 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
            project
          </span>
        )}
      </div>
      <p className="truncate font-mono text-[11px] text-muted-foreground/70">{summary}</p>
    </div>
  );
}
