import { CopyIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrandIcon } from "@/components/BrandIcon";
import { agentBrand, agentInitial } from "@/features/models/agentBrands";
import { openUrl } from "@/lib/openUrl";
import type { AgentInfo } from "@/hooks/useAgents";

interface AgentDetailDialogProps {
  agent: AgentInfo | null;
  isDefault: boolean;
  canBeDefault: boolean;
  onOpenChange: (open: boolean) => void;
  onMakeDefault: () => void;
}

function copy(value: string, label: string) {
  navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
}

export function AgentDetailDialog({
  agent,
  isDefault,
  canBeDefault,
  onOpenChange,
  onMakeDefault,
}: AgentDetailDialogProps) {
  if (!agent) return null;
  const brand = agentBrand(agent.id);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary/60">
              {brand ? (
                <BrandIcon mark={brand} className="size-6" />
              ) : (
                <span className="text-lg font-semibold text-muted-foreground">
                  {agentInitial(agent.id, agent.vendor)}
                </span>
              )}
            </span>
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                {agent.name}
                {isDefault && <Badge variant="secondary">Default</Badge>}
              </DialogTitle>
              <DialogDescription>
                {agent.vendor} · {agent.installed ? "Installed" : "Not installed"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{agent.description}</p>

        {agent.installed ? (
          <div className="space-y-2">
            {agent.version && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Version</p>
                <p className="font-mono text-xs text-foreground">{agent.version}</p>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Binary</p>
              <div className="flex items-center gap-1.5">
                <code className="min-w-0 flex-1 truncate rounded bg-secondary px-2 py-1 font-mono text-[11px]">
                  {agent.path}
                </code>
                <Button size="sm" variant="ghost" className="cursor-pointer" onClick={() => copy(agent.path ?? "", "Path")}>
                  <CopyIcon />
                </Button>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">
                Config {agent.configExists ? "" : "(not created yet)"}
              </p>
              <div className="flex items-center gap-1.5">
                <code className="min-w-0 flex-1 truncate rounded bg-secondary px-2 py-1 font-mono text-[11px]">
                  {agent.configDir}
                </code>
                <Button size="sm" variant="ghost" className="cursor-pointer" onClick={() => copy(agent.configDir ?? "", "Config path")}>
                  <CopyIcon />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Install with</p>
            <div className="flex items-center gap-1.5">
              <code className="min-w-0 flex-1 overflow-x-auto rounded bg-secondary px-2 py-1.5 font-mono text-[11px]">
                {agent.installCommand}
              </code>
              <Button size="sm" variant="ghost" className="cursor-pointer" onClick={() => copy(agent.installCommand, "Command")}>
                <CopyIcon />
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer"
            onClick={() => openUrl(agent.installed ? agent.docsUrl : agent.installUrl)}
          >
            <ExternalLinkIcon />
            {agent.installed ? "Docs" : "Get it"}
          </Button>
          {agent.installed && canBeDefault && !isDefault && (
            <Button size="sm" className="cursor-pointer" onClick={onMakeDefault}>
              Make default
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
