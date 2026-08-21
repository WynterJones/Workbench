import { useState } from "react";
import { ListChecksIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllProjectTags, useBulkUpdateProjects } from "@/hooks/useProjects";
import type { Project, ProjectStatus } from "@/lib/types";

interface BulkProjectActionsProps {
  selecting: boolean;
  selected: Project[];
  visibleCount: number;
  onToggleSelecting: () => void;
  onSelectVisible: () => void;
  onClear: () => void;
}

export function BulkProjectActions({
  selecting, selected, visibleCount, onToggleSelecting, onSelectVisible, onClear,
}: BulkProjectActionsProps) {
  const [tag, setTag] = useState("");
  const [status, setStatus] = useState("");
  const availableTags = useAllProjectTags();
  const update = useBulkUpdateProjects();
  const allVisibleSelected = selected.length === visibleCount;

  function showError(error: Error) {
    toast.error("Could not update selected projects", { description: error.message });
  }

  function applyTag(event: React.FormEvent) {
    event.preventDefault();
    const next = tag.trim().toLowerCase();
    if (!next || selected.length === 0) return;
    const count = selected.filter((project) => !project.tags.includes(next)).length;
    if (count === 0) {
      toast.message("That tag is already on every selected project");
      return;
    }
    update.mutate(
      { projects: selected, tag: next },
      {
        onSuccess: () => {
          toast.success(`Added ${next} to ${count} project${count === 1 ? "" : "s"}`);
          setTag("");
        },
        onError: showError,
      },
    );
  }

  function applyStatus(value: string) {
    const next = value as ProjectStatus;
    const count = selected.filter((project) => project.status !== next).length;
    setStatus(value);
    if (count === 0) {
      toast.message(`Every selected project is already ${next}`);
      setStatus("");
      return;
    }
    update.mutate(
      { projects: selected, status: next },
      {
        onSuccess: () =>
          toast.success(`Marked ${count} project${count === 1 ? "" : "s"} as ${next}`),
        onError: showError,
        onSettled: () => setStatus(""),
      },
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
      <Button
        type="button"
        size="sm"
        variant={selecting ? "secondary" : "outline"}
        aria-pressed={selecting}
        disabled={update.isPending}
        onClick={onToggleSelecting}
      >
        <ListChecksIcon />
        {selecting ? "Done" : "Select projects"}
      </Button>

      {selecting && (
        <>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {selected.length} selected
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={update.isPending}
            onClick={allVisibleSelected ? onClear : onSelectVisible}
          >
            {allVisibleSelected ? "Clear" : "Select visible"}
          </Button>

          <form onSubmit={applyTag} className="flex flex-wrap items-center gap-2">
            <label htmlFor="bulk-project-tag" className="text-xs text-muted-foreground">
              Tag
            </label>
            <Input
              id="bulk-project-tag"
              name="tag"
              list="bulk-project-tag-suggestions"
              maxLength={32}
              autoComplete="off"
              value={tag}
              disabled={selected.length === 0 || update.isPending}
              onChange={(event) => setTag(event.target.value)}
              placeholder="Choose or create"
              className="h-8 w-40 text-xs"
            />
            <datalist id="bulk-project-tag-suggestions">
              {availableTags.map((availableTag) => (
                <option key={availableTag} value={availableTag} />
              ))}
            </datalist>
            <Button
              type="submit"
              size="sm"
              disabled={!tag.trim() || selected.length === 0 || update.isPending}
            >
              Add
            </Button>
          </form>

          <div className="flex items-center gap-2">
            <label htmlFor="bulk-project-status" className="text-xs text-muted-foreground">
              Status
            </label>
            <Select
              value={status}
              disabled={selected.length === 0 || update.isPending}
              onValueChange={applyStatus}
            >
              <SelectTrigger id="bulk-project-status" size="sm" className="w-36">
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="runnable">Runnable</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}
