import { CopyIcon, KeyRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyStateBlock } from "@/components/EmptyStateBlock";
import { PlugIcon } from "lucide-react";
import { AgentMarkIcon } from "@/features/models/AgentMarkIcon";
import type { McpServer } from "@/hooks/useMcpServers";

const AGENT_LABEL: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  "gemini-cli": "Gemini CLI",
  "cursor-agent": "Cursor",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <code className="min-w-0 flex-1 truncate rounded bg-secondary px-2 py-1 font-mono text-[11px] text-foreground/90">
          {value}
        </code>
        <Button
          size="icon-sm"
          variant="ghost"
          className="cursor-pointer"
          title="Copy"
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success("Copied");
          }}
        >
          <CopyIcon className="size-3" />
        </Button>
      </div>
    </div>
  );
}

interface McpDetailProps {
  server: McpServer | null;
}

export function McpDetail({ server }: McpDetailProps) {
  if (!server) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyStateBlock
          icon={PlugIcon}
          title="Select a server"
          message="Pick an MCP server on the left to see how it is configured."
        />
      </div>
    );
  }

  const invocation = server.url ?? [server.command, ...server.args].filter(Boolean).join(" ");

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="mb-4 space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2.5">
          <AgentMarkIcon
            agentId={server.agent}
            vendor={server.agent}
            className="size-5 text-foreground/90"
          />
          <h2 className="min-w-0 flex-1 truncate text-lg font-semibold text-foreground">
            {server.name}
          </h2>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{AGENT_LABEL[server.agent] ?? server.agent}</Badge>
          <Badge variant="outline">{server.transport}</Badge>
          <Badge variant={server.scope === "project" ? "secondary" : "outline"}>
            {server.scope}
          </Badge>
        </div>

        <div className="divide-y divide-border">
          {invocation && <Row label={server.url ? "Endpoint" : "Command"} value={invocation} />}
          {server.project && <Row label="Project" value={server.project} />}
          <Row label="Config file" value={server.source} />
        </div>
      </div>

      {server.envKeys.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <KeyRoundIcon className="size-3.5" strokeWidth={1.75} />
            Environment · {server.envKeys.length}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {server.envKeys.map((key) => (
              <span
                key={key}
                className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {key}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground/60">
            Workbench never reads or displays the values, only the names.
          </p>
        </div>
      )}
    </div>
  );
}
