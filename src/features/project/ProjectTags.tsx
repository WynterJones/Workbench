import { useState } from "react";
import { PlusIcon, TagIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAllProjectTags, useSetProjectTags } from "@/hooks/useProjects";
import type { Project } from "@/lib/types";

export function ProjectTags({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const availableTags = useAllProjectTags();
  const update = useSetProjectTags();
  const suggestionsId = `project-tag-suggestions-${project.id}`;

  function save(tags: string[], message: string) {
    update.mutate(
      { id: project.id, tags },
      {
        onSuccess: () => toast.success(message),
        onError: (error) =>
          toast.error("Could not update tags", {
            description: error instanceof Error ? error.message : String(error),
          }),
      },
    );
  }

  function add(event: React.FormEvent) {
    event.preventDefault();
    const tag = value.trim().toLowerCase();
    if (!tag) return;
    if (project.tags.some((current) => current.toLowerCase() === tag)) {
      toast.message("That tag is already on this project");
      return;
    }
    save([...project.tags, tag], `Added ${tag}`);
    setValue("");
    setEditing(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Project tags">
      <span className="mr-0.5 flex items-center gap-1 text-xs text-muted-foreground">
        <TagIcon className="size-3" />
        Tags
      </span>
      {project.tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag} tag`}
            disabled={update.isPending}
            onClick={() => save(project.tags.filter((current) => current !== tag), `Removed ${tag}`)}
            className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-background/60 hover:text-foreground disabled:cursor-wait disabled:opacity-50"
          >
            <XIcon className="size-2.5" />
          </button>
        </Badge>
      ))}

      {editing ? (
        <form onSubmit={add} className="flex items-center gap-1">
          <label htmlFor={`project-tag-${project.id}`} className="sr-only">
            Project tag
          </label>
          <Input
            id={`project-tag-${project.id}`}
            name="tag"
            list={suggestionsId}
            autoFocus
            required
            maxLength={32}
            autoComplete="off"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setValue("");
                setEditing(false);
              }
            }}
            placeholder="Choose or create"
            className="h-7 w-44 text-xs"
          />
          <datalist id={suggestionsId}>
            {availableTags
              .filter((tag) => !project.tags.includes(tag))
              .map((tag) => <option key={tag} value={tag} />)}
          </datalist>
          <Button type="submit" size="xs" disabled={update.isPending}>
            Add
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label="Cancel adding tag"
            onClick={() => {
              setValue("");
              setEditing(false);
            }}
          >
            <XIcon />
          </Button>
        </form>
      ) : (
        <Button type="button" size="xs" variant="ghost" onClick={() => setEditing(true)}>
          <PlusIcon />
          Add tag
        </Button>
      )}
    </div>
  );
}
