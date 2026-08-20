import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { GitBranchPlusIcon } from "lucide-react";
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

interface InitRepoButtonProps {
  projectId: number;
  projectPath: string;
}

export function InitRepoButton({ projectId, projectPath }: InitRepoButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();

  async function initialise() {
    setPending(true);
    try {
      await invoke<string>("init_repository", { projectId });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toast.success("Repository created", { description: "Nothing is committed yet." });
      setOpen(false);
    } catch (error) {
      toast.error("Could not create the repository", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => setOpen(true)}>
        <GitBranchPlusIcon />
        Start tracking with git
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a git repository?</DialogTitle>
            <DialogDescription>
              This writes a new .git directory inside the project. Nothing is committed and no
              existing files are touched.
            </DialogDescription>
          </DialogHeader>
          <pre className="overflow-x-auto rounded-md border border-border bg-card p-2 font-mono text-xs text-muted-foreground">
            git init {projectPath}
          </pre>
          <DialogFooter>
            <Button variant="ghost" className="cursor-pointer" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="cursor-pointer" onClick={initialise} disabled={pending}>
              {pending ? "Creating…" : "Create repository"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
