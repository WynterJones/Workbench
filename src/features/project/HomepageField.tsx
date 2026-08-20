import { useEffect, useState } from "react";
import { ExternalLinkIcon, LinkIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateProject } from "@/hooks/useProjects";
import { openUrl } from "@/lib/openUrl";
import type { Project } from "@/lib/types";

function normalise(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

interface HomepageFieldProps {
  project: Project;
}

export function HomepageField({ project }: HomepageFieldProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(project.homepage ?? "");
  const update = useUpdateProject();

  useEffect(() => {
    setValue(project.homepage ?? "");
  }, [project.homepage]);

  function save() {
    const homepage = normalise(value);
    update.mutate(
      { id: project.id, patch: { homepage } },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success(homepage ? "Link saved" : "Link removed");
        },
        onError: (error) =>
          toast.error("Could not save the link", {
            description: error instanceof Error ? error.message : String(error),
          }),
      },
    );
  }

  if (!editing && project.homepage) {
    return (
      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => openUrl(project.homepage as string)}
          className="flex cursor-pointer items-center gap-1 text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
        >
          <ExternalLinkIcon className="size-3" strokeWidth={1.75} />
          {project.homepage.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="cursor-pointer text-[11px] text-muted-foreground/50 hover:text-foreground"
        >
          edit
        </button>
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex cursor-pointer items-center gap-1 text-muted-foreground/70 transition-colors duration-150 ease-out hover:text-foreground"
      >
        <LinkIcon className="size-3" strokeWidth={1.75} />
        Add link
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <Input
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") save();
          if (event.key === "Escape") {
            setValue(project.homepage ?? "");
            setEditing(false);
          }
        }}
        placeholder="example.com"
        className="h-7 w-56 text-xs"
      />
      <Button size="sm" className="h-7 cursor-pointer" onClick={save} disabled={update.isPending}>
        Save
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        className="cursor-pointer"
        onClick={() => {
          setValue(project.homepage ?? "");
          setEditing(false);
        }}
      >
        <XIcon className="size-3.5" />
      </Button>
    </span>
  );
}
