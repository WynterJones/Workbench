import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TrashConfirmDialogProps {
  paths: string[] | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending?: boolean;
}

export function TrashConfirmDialog({ paths, onOpenChange, onConfirm, pending }: TrashConfirmDialogProps) {
  const count = paths?.length ?? 0;

  return (
    <Dialog open={Boolean(paths)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Move to Trash</DialogTitle>
          <DialogDescription>
            {count === 1 ? paths?.[0] : `${count} items`} will be moved to the macOS Trash. This can be
            undone from Trash, but not from Workbench.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? "Moving…" : "Move to Trash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
