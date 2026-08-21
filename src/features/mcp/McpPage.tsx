import { useMemo, useState } from "react";
import { EyeIcon, EyeOffIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentMarkIcon } from "@/features/models/AgentMarkIcon";
import { McpRow } from "@/features/mcp/McpRow";
import { McpDetail } from "@/features/mcp/McpDetail";
import { useMcpServers } from "@/hooks/useMcpServers";
import { useUserPreferences } from "@/lib/userPreferences";

const AGENT_LABEL: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  "gemini-cli": "Gemini CLI",
  "cursor-agent": "Cursor",
};

export function McpPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useMcpServers();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const hiddenIds = useUserPreferences((state) => state.hiddenMcpIds);
  const hideMcp = useUserPreferences((state) => state.hideMcp);
  const showMcp = useUserPreferences((state) => state.showMcp);

  const grouped = useMemo(() => {
    const needle = search.toLowerCase();
    const filtered = (data ?? []).filter(
      (server) =>
        (showHidden || !hiddenIds.includes(server.id)) &&
        (server.name.toLowerCase().includes(needle) ||
          (server.command ?? "").toLowerCase().includes(needle) ||
          (server.project ?? "").toLowerCase().includes(needle)),
    );
    return Object.entries(
      filtered.reduce<Record<string, typeof filtered>>((acc, server) => {
        (acc[server.agent] ??= []).push(server);
        return acc;
      }, {}),
    );
  }, [data, search, hiddenIds, showHidden]);

  const active = (data ?? []).find((server) => server.id === selected) ?? null;

  return (
    <div className="flex h-full min-h-0">
      <div className="flex w-[340px] shrink-0 flex-col border-r border-border">
        <div className="flex shrink-0 items-center gap-2 border-b border-border p-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter MCP servers…"
          />
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Reload"
            className="cursor-pointer"
          >
            <RefreshCwIcon className={isFetching ? "size-3.5 animate-spin" : "size-3.5"} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setShowHidden((value) => !value)}
            aria-label={showHidden ? "Hide hidden MCP servers" : "Show hidden MCP servers"}
            aria-pressed={showHidden}
            title={showHidden ? "Hide hidden servers" : `Show hidden servers (${hiddenIds.length})`}
          >
            {showHidden ? <EyeIcon /> : <EyeOffIcon />}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={() => refetch()}
            isEmpty={grouped.length === 0}
            emptyTitle="No MCP servers"
            emptyMessage="Nothing configured for Claude Code, Codex, Gemini or Cursor yet."
            compact
            skeleton={
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            }
          >
            {grouped.map(([agent, servers]) => (
              <div key={agent} className="mb-4">
                <p className="flex items-center gap-2 px-2.5 pb-2 text-sm font-medium text-muted-foreground">
                  <AgentMarkIcon agentId={agent} vendor={agent} className="size-4 text-current" />
                  {AGENT_LABEL[agent] ?? agent} · {servers.length}
                </p>
                <div className="space-y-0.5">
                  {servers.map((server) => (
                    <McpRow
                      key={server.id}
                      server={server}
                      selected={selected === server.id}
                      onSelect={() => setSelected(server.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </QueryState>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <McpDetail
          server={active}
          hidden={Boolean(active && hiddenIds.includes(active.id))}
          onHiddenChange={(hidden) => {
            if (!active) return;
            if (hidden) {
              hideMcp(active.id);
              setSelected(null);
            } else {
              showMcp(active.id);
            }
          }}
        />
      </div>
    </div>
  );
}
