import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckboxDot } from "@/components/CheckboxDot";
import { useInstallSkill } from "@/hooks/useSkills";
import type { RegistrySkill } from "@/hooks/useSkillSearch";

const AGENTS = [
  { id: "claude-code", label: "Claude Code" },
  { id: "codex", label: "Codex" },
];

interface InstallSkillDialogProps {
  skill: RegistrySkill | null;
  onOpenChange: (open: boolean) => void;
  onInstalled: () => void;
}

export function InstallSkillDialog({ skill, onOpenChange, onInstalled }: InstallSkillDialogProps) {
  const [targets, setTargets] = useState<string[]>(AGENTS.map((a) => a.id));
  const install = useInstallSkill();

  if (!skill) return null;

  const agentArg = targets.length === AGENTS.length ? "*" : targets.join(",");
  const command = `npx skills add ${skill.id} -g -y -a ${agentArg}`;

  function toggle(id: string) {
    setTargets((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    );
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install {skill.skill}</DialogTitle>
          <DialogDescription>
            From {skill.owner}/{skill.repo} · {skill.installsLabel} installs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Install for</p>
            {AGENTS.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => toggle(agent.id)}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
              >
                <CheckboxDot checked={targets.includes(agent.id)} />
                {agent.label}
              </button>
            ))}
          </div>

          <div>
            <p className="mb-1 text-xs text-muted-foreground">This will run</p>
            <pre className="overflow-x-auto rounded-md border border-border bg-card p-2 font-mono text-xs text-foreground">
              {command}
            </pre>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" className="cursor-pointer" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="cursor-pointer"
            disabled={targets.length === 0 || install.isPending}
            onClick={() =>
              install.mutate(
                { pkg: skill.id, agents: targets.length === AGENTS.length ? [] : targets },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    onInstalled();
                  },
                },
              )
            }
          >
            {install.isPending ? "Installing…" : "Install"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
