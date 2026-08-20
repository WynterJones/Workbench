import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CopyIcon, TerminalIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useStartAiSession } from "@/hooks/useAiSession";
import { useProjectTodos } from "@/hooks/useProject";
import { api } from "@/lib/api";
import type { AiProvider, Project } from "@/lib/types";

interface AiLaunchDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PROVIDERS: { value: AiProvider; label: string }[] = [
  { value: "claude-code", label: "Claude Code" },
  { value: "codex", label: "Codex" },
];

export function AiLaunchDialog({ project, open, onOpenChange }: AiLaunchDialogProps) {
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.getSettings() });
  const { data: todos } = useProjectTodos(open ? project.id : null);
  const startSession = useStartAiSession();
  const [provider, setProvider] = useState<AiProvider>("claude-code");

  useEffect(() => {
    if (settings) setProvider(settings.aiProvider);
  }, [settings]);

  const prompt = useMemo(() => {
    const lines = [
      `Project: ${project.name}`,
      `Path: ${project.path}`,
      `Framework: ${project.framework}${project.language ? ` (${project.language})` : ""}`,
      `Status: ${project.status}${project.brokenReason ? ` — ${project.brokenReason}` : ""}`,
      project.gitBranch ? `Git branch: ${project.gitBranch}${project.gitDirty ? " (dirty)" : ""}` : null,
      "",
      project.readmeSummary ? `README:\n${project.readmeSummary}` : "No README found.",
      "",
      todos && todos.length > 0 ? `Open TODOs:\n${todos.slice(0, 20).join("\n")}` : "No outstanding TODOs.",
    ];
    return lines.filter((line) => line !== null).join("\n");
  }, [project, todos]);

  const session = startSession.data;

  function launch() {
    startSession.mutate({ id: project.id, provider });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Continue with AI</DialogTitle>
          <DialogDescription>
            Launches a detached tmux session in the project directory with this context.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          {PROVIDERS.map((option) => (
            <Button
              key={option.value}
              variant={provider === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setProvider(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <Textarea value={prompt} readOnly className="h-40 font-mono text-xs" />

        {session && (
          <div className="space-y-2 rounded-md border border-border bg-secondary/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <code className="truncate font-mono text-xs">{session.attachCommand}</code>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(session.attachCommand);
                    toast.success("Copied");
                  }}
                >
                  <CopyIcon />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => api.openIn("terminal", project.id)}
                >
                  <TerminalIcon />
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={launch} disabled={startSession.isPending}>
            {startSession.isPending ? "Starting…" : "Start session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
