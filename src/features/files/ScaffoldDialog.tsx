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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStarters, useScaffoldProgress } from "@/hooks/useStarters";
import { useFilesStore } from "@/lib/filesStore";
import { useJumpToProject } from "@/features/files/lib/useJumpToProject";
import { isValidProjectName } from "@/features/files/lib/paths";
import type { StarterTemplate } from "@/lib/filesApi";

interface ScaffoldDialogProps {
  starter: StarterTemplate | null;
  parentDir: string;
  onOpenChange: (open: boolean) => void;
}

export function ScaffoldDialog({ starter, parentDir, onOpenChange }: ScaffoldDialogProps) {
  const [name, setName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const { scaffold } = useStarters();
  const progressLines = useScaffoldProgress(confirmed);
  const select = useFilesStore((s) => s.select);
  const jumpToProject = useJumpToProject();

  const nameValid = name.length > 0 && isValidProjectName(name);
  const result = scaffold.data;

  function launch() {
    if (!starter || !nameValid) return;
    setConfirmed(true);
    scaffold.mutate({ starterId: starter.id, parentDir, projectName: name, confirmed: true });
  }

  function close(open: boolean) {
    if (!open) {
      setName("");
      setConfirmed(false);
      scaffold.reset();
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={Boolean(starter)} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{starter?.name}</DialogTitle>
          <DialogDescription>{starter?.description}</DialogDescription>
        </DialogHeader>

        {!confirmed && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-app"
                className="font-mono"
              />
              {name.length > 0 && !nameValid && (
                <p className="text-xs text-destructive">Only letters, numbers, dots, dashes and underscores.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Destination</Label>
              <p className="truncate rounded-md border border-border bg-secondary/30 px-3 py-2 font-mono text-xs text-muted-foreground">
                {parentDir}/{name || "…"}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Command</Label>
              <code className="block rounded-md border border-border bg-secondary/30 px-3 py-2 font-mono text-xs">
                {starter?.command}
              </code>
            </div>
          </div>
        )}

        {confirmed && (
          <div className="space-y-3">
            <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-black/40 p-3 font-mono text-[11px] text-foreground/80">
              {progressLines.length === 0 ? (
                <span className="text-muted-foreground">Starting…</span>
              ) : (
                progressLines.map((line, i) => <div key={i}>{line}</div>)
              )}
            </div>
            {result && !result.ok && <p className="text-xs text-destructive">{result.message}</p>}
          </div>
        )}

        <DialogFooter>
          {!confirmed && (
            <>
              <Button variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button onClick={launch} disabled={!nameValid}>
                Scaffold
              </Button>
            </>
          )}
          {confirmed && result?.ok && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  select(result.projectPath, "dir");
                  close(false);
                }}
              >
                Reveal in Files
              </Button>
              <Button
                onClick={() => {
                  jumpToProject(result.projectPath);
                  close(false);
                }}
              >
                Open in Workbench
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
