import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/types";

interface TrustDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending: boolean;
}

export function TrustDialog({ project, open, onOpenChange, onConfirm, pending }: TrustDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trust and run {project.name}?</DialogTitle>
          <DialogDescription>
            Workbench never executes project code until you approve it. This will run the command
            below on your machine.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Command</p>
            <pre className="overflow-x-auto rounded-md border border-border bg-card p-2 font-mono text-xs text-foreground">
              {project.runCmd ?? "No run command detected"}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Working directory</p>
            <pre className="overflow-x-auto rounded-md border border-border bg-card p-2 font-mono text-xs text-muted-foreground">
              {project.path}
            </pre>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={pending || !project.runCmd} className="cursor-pointer">
            {pending ? "Starting…" : "Trust and run"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
