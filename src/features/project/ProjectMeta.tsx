import { ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";
import { HomepageField } from "@/features/project/HomepageField";
import { FrameworkBadge } from "@/features/library/FrameworkBadge";
import { StatusBadge } from "@/features/library/StatusBadge";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { daysSince, formatLoc, truncatePath } from "@/lib/format";
import type { Project } from "@/lib/types";

interface ProjectMetaProps {
  project: Project;
}

export function ProjectMeta({ project }: ProjectMetaProps) {
  const filterByFramework = useAppStore((state) => state.filterByFramework);
  const stackLine = [project.language, project.packageManager !== "none" ? project.packageManager : null]
    .filter(Boolean)
    .join(" · ");
  const days = daysSince(project.lastModified);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <StatusBadge status={project.status} />
        <h1 className="truncate text-2xl font-semibold">{project.name}</h1>
        {project.archived && (
          <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            Archived
          </span>
        )}
      </div>
      <p className="font-mono text-xs text-muted-foreground">{truncatePath(project.path, 64)}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        <FrameworkBadge framework={project.framework} onClick={() => filterByFramework(project.framework)} />
        {stackLine && <span>{stackLine}</span>}
        <span>{days === 0 ? "modified today" : `modified ${days}d ago`}</span>
        <span>{formatLoc(project.loc)} LOC</span>
        <span className="capitalize">{project.status}</span>
        {project.gitRemote && (
          <button
            type="button"
            onClick={() =>
              api
                .openIn("github", project.id)
                .catch((error) =>
                  toast.error("Failed to open GitHub", {
                    description: error instanceof Error ? error.message : String(error),
                  })
                )
            }
            className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground"
          >
            GitHub
            <ExternalLinkIcon className="size-3" />
          </button>
        )}
        <HomepageField project={project} />
      </div>
    </div>
  );
}
