import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2Icon, LoaderIcon, SparklesIcon, TriangleAlertIcon } from "lucide-react";
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
import { api } from "@/lib/api";
import { explainBrokenReason } from "@/lib/brokenReason";
import { startRunFix, useHandoff } from "@/hooks/useRunFix";
import type { AiProvider, BrokenReason, Project } from "@/lib/types";

const PROVIDERS: { value: AiProvider; label: string }[] = [
  { value: "claude-code", label: "Claude Code" },
  { value: "codex", label: "Codex" },
];

interface RunFixDialogProps {
  project: Project;
  reason: BrokenReason | null;
  logTail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RunFixDialog({ project, reason, logTail, open, onOpenChange }: RunFixDialogProps) {
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.getSettings() });
  const [provider, setProvider] = useState<AiProvider>("claude-code");
  const [waiting, setWaiting] = useState(false);
  const { data: outcome } = useHandoff(project.id, open && waiting);
  const explained = explainBrokenReason(reason);

  useEffect(() => {
    if (settings) setProvider(settings.aiProvider);
  }, [settings]);

  useEffect(() => {
    if (!open) setWaiting(false);
  }, [open]);

  useEffect(() => {
    if (!outcome) return;
    setWaiting(false);
    if (outcome.report.ok) {
      toast.success("Workbench can run this now", {
        description: outcome.captured ? "Run command saved and screenshot captured." : undefined,
      });
    }
  }, [outcome]);

  async function handOff() {
    try {
      await startRunFix({
        id: project.id,
        path: project.path,
        provider,
        reason,
        logTail: logTail.slice(-2000),
      });
      setWaiting(true);
    } catch (error) {
      toast.error("Could not start the agent", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{explained?.title ?? "Workbench could not start this"}</DialogTitle>
          <DialogDescription>
            {explained?.detail} Hand it to an agent in the terminal — it will work out how to run{" "}
            {project.name}, then report the command back here.
          </DialogDescription>
        </DialogHeader>

        {outcome ? (
          <div className="flex gap-2.5 rounded-lg border border-border bg-secondary/30 p-3">
            {outcome.report.ok ? (
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-400" />
            ) : (
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-400" />
            )}
            <div className="min-w-0 space-y-1">
              {outcome.report.runCommand && (
                <p className="font-mono text-xs break-all text-foreground">
                  {outcome.report.runCommand}
                </p>
              )}
              {outcome.report.note && (
                <p className="text-xs text-muted-foreground">{outcome.report.note}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {PROVIDERS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={provider === option.value ? "default" : "outline"}
                onClick={() => setProvider(option.value)}
                disabled={waiting}
                className="cursor-pointer"
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}

        {waiting && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <LoaderIcon className="size-3.5 animate-spin" />
            Working in the terminal. Workbench applies the result as soon as the agent reports back.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            {outcome ? "Done" : "Cancel"}
          </Button>
          {!outcome && (
            <Button onClick={handOff} disabled={waiting} className="cursor-pointer gap-1.5">
              <SparklesIcon className="size-3.5" />
              {waiting ? "Agent is working…" : "Fix and run with AI"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
