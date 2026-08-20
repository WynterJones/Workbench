import { CopyIcon, FolderOpenIcon } from "lucide-react";
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
import type { ManualRun } from "@/lib/manualRun";
import type { Project } from "@/lib/types";

interface ManualRunDialogProps {
  project: Project;
  guide: ManualRun;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualRunDialog({ project, guide, open, onOpenChange }: ManualRunDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{guide.title}</DialogTitle>
          <DialogDescription>{guide.detail}</DialogDescription>
        </DialogHeader>

        <ol className="space-y-2">
          {guide.steps.map((step, index) => (
            <li key={step} className="flex gap-2.5 text-sm text-foreground">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[10px] text-muted-foreground">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <p className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 font-mono text-xs break-all text-muted-foreground">
          {project.path}
          <Button
            size="icon-sm"
            variant="ghost"
            className="ml-auto shrink-0 cursor-pointer"
            title="Copy path"
            onClick={() => {
              navigator.clipboard.writeText(project.path);
              toast.success("Path copied");
            }}
          >
            <CopyIcon className="size-3.5" />
          </Button>
        </p>

        <DialogFooter>
          <Button
            variant="outline"
            className="cursor-pointer gap-1.5"
            onClick={() => api.openIn("finder", project.id)}
          >
            <FolderOpenIcon className="size-3.5" />
            Reveal in Finder
          </Button>
          <Button onClick={() => onOpenChange(false)} className="cursor-pointer">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
