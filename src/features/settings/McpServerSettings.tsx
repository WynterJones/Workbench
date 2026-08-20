import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { CheckIcon, CopyIcon, PlugIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AgentMarkIcon } from "@/features/models/AgentMarkIcon";

interface WorkbenchMcp {
  binary: string;
  commandLine: string;
  configSnippet: string;
  installedFor: string[];
}

const AGENTS = [
  { id: "claude-code", label: "Claude Code" },
  { id: "codex", label: "Codex" },
  { id: "gemini-cli", label: "Gemini CLI" },
  { id: "cursor-agent", label: "Cursor" },
];

export function McpServerSettings() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["workbench-mcp"],
    queryFn: () => invoke<WorkbenchMcp>("workbench_mcp"),
  });

  const install = useMutation({
    mutationFn: (agent: string) => invoke<void>("install_workbench_mcp", { agent }),
    onSuccess: (_result, agent) => {
      queryClient.invalidateQueries({ queryKey: ["workbench-mcp"] });
      queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
      toast.success(`Workbench added to ${agent}`, {
        description: "Restart the agent to pick up the new server.",
      });
    },
    onError: (error) => {
      toast.error("Could not install", {
        description: error instanceof Error ? error.message : String(error),
      });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <PlugIcon className="size-4 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Workbench as an MCP server</p>
          <p className="text-xs text-muted-foreground">
            Let any coding agent query your catalog — search projects, read one project's detail,
            and pull library totals. Read-only, and it works whether or not Workbench is open.
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2">
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
            {data?.commandLine ?? "…"}
          </code>
          <Button
            size="icon-sm"
            variant="ghost"
            className="shrink-0 cursor-pointer"
            title="Copy the MCP config"
            onClick={() => {
              if (!data) return;
              navigator.clipboard.writeText(data.configSnippet);
              toast.success("Config copied");
            }}
          >
            <CopyIcon className="size-3.5" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {AGENTS.map((agent) => {
            const installed = data?.installedFor.includes(agent.id) ?? false;
            return (
              <Button
                key={agent.id}
                size="sm"
                variant={installed ? "outline" : "default"}
                disabled={installed || install.isPending}
                onClick={() => install.mutate(agent.id)}
                className="cursor-pointer gap-1.5"
              >
                {installed ? (
                  <CheckIcon className="size-3.5" />
                ) : (
                  <AgentMarkIcon agentId={agent.id} vendor={agent.label} className="size-3.5" />
                )}
                {installed ? `${agent.label} — added` : agent.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
