import { CheckCircle2Icon, CopyIcon, ExternalLinkIcon, FolderOpenIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { openUrl } from "@/lib/openUrl";
import { cn } from "@/lib/utils";
import type { AgentInfo } from "@/hooks/useAgents";

interface AgentCardProps {
  agent: AgentInfo;
  isDefault: boolean;
  onMakeDefault?: () => void;
}

function copy(value: string, label: string) {
  navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
}

export function AgentCard({ agent, isDefault, onMakeDefault }: AgentCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4",
        !agent.installed && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            {agent.name}
            {agent.installed && <CheckCircle2Icon className="size-3.5 text-ok" strokeWidth={2} />}
          </p>
          <p className="text-xs text-muted-foreground">{agent.vendor}</p>
        </div>
        {isDefault && <Badge variant="secondary">Default</Badge>}
      </div>

      <p className="text-xs text-muted-foreground">{agent.description}</p>

      {agent.installed ? (
        <div className="space-y-1.5">
          {agent.version && (
            <p className="font-mono text-[11px] text-muted-foreground">{agent.version}</p>
          )}
          <div className="flex items-center gap-1.5">
            <code className="min-w-0 flex-1 truncate rounded bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground">
              {agent.path}
            </code>
            <Button
              size="sm"
              variant="ghost"
              className="cursor-pointer"
              onClick={() => copy(agent.path ?? "", "Path")}
            >
              <CopyIcon />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Config {agent.configExists ? "found" : "not created yet"}
            {agent.configDir ? ` · ${agent.configDir}` : ""}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <code className="min-w-0 flex-1 truncate rounded bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground">
            {agent.installCommand}
          </code>
          <Button
            size="sm"
            variant="ghost"
            className="cursor-pointer"
            onClick={() => copy(agent.installCommand, "Command")}
          >
            <CopyIcon />
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="cursor-pointer"
          onClick={() => openUrl(agent.installed ? agent.docsUrl : agent.installUrl)}
        >
          <ExternalLinkIcon />
          {agent.installed ? "Docs" : "Get it"}
        </Button>
        {agent.installed && agent.configExists && agent.configDir && (
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer"
            onClick={() => copy(agent.configDir ?? "", "Config path")}
          >
            <FolderOpenIcon />
            Config
          </Button>
        )}
        {agent.installed && onMakeDefault && !isDefault && (
          <Button size="sm" variant="ghost" className="cursor-pointer" onClick={onMakeDefault}>
            Make default
          </Button>
        )}
      </div>
    </div>
  );
}
