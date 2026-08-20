import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { EyeOffIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import type { Project } from "@/lib/types";

interface DeleteProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteProjectDialog({ project, open, onOpenChange }: DeleteProjectDialogProps) {
  const [pending, setPending] = useState<"forget" | "trash" | null>(null);
  const queryClient = useQueryClient();
  const closeProject = useAppStore((s) => s.closeProject);

  async function act(kind: "forget" | "trash") {
    setPending(kind);
    try {
      await invoke(kind === "forget" ? "forget_project" : "trash_project_folder", {
        id: project.id,
      });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["shelf-count"] });
      await queryClient.invalidateQueries({ queryKey: ["libraryStats"] });
      await queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toast.success(
        kind === "forget" ? "Removed from Workbench" : "Moved to Trash",
        {
          description:
            kind === "forget"
              ? "The folder is untouched. A rescan will find it again."
              : "You can restore it from the macOS Trash.",
        },
      );
      onOpenChange(false);
      closeProject();
    } catch (error) {
      toast.error("Could not delete", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {project.name}?</DialogTitle>
          <DialogDescription>Two options, and one of them touches your disk.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => act("forget")}
            className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors duration-150 ease-out hover:border-muted-foreground/40 disabled:opacity-50"
          >
            <EyeOffIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                {pending === "forget" ? "Removing…" : "Remove from Workbench"}
              </span>
              <span className="block text-xs text-muted-foreground">
                Forgets the project and its screenshots and tags. The folder on disk is left
                completely alone, and a rescan will find it again.
              </span>
            </span>
          </button>

          <button
            type="button"
            disabled={pending !== null}
            onClick={() => act("trash")}
            className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-left transition-colors duration-150 ease-out hover:border-destructive/60 disabled:opacity-50"
          >
            <Trash2Icon className="mt-0.5 size-4 shrink-0 text-destructive" strokeWidth={1.75} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                {pending === "trash" ? "Moving to Trash…" : "Delete from filesystem"}
              </span>
              <span className="block text-xs text-muted-foreground">
                Moves the whole folder to the macOS Trash, so you can still get it back. Also
                removes it from Workbench.
              </span>
              <code className="mt-1.5 block truncate rounded bg-secondary px-1.5 py-1 font-mono text-[10px] text-muted-foreground">
                {project.path}
              </code>
            </span>
          </button>
        </div>

        <Button variant="ghost" className="cursor-pointer" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
