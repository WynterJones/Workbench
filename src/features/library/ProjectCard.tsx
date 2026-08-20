import { CodeIcon, FolderOpenIcon, GitBranchIcon, PlayIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScreenshotThumb } from "@/features/library/ScreenshotThumb";
import { FrameworkBadge } from "@/features/library/FrameworkBadge";
import { StatusBadge } from "@/features/library/StatusBadge";
import { ProjectContextMenu } from "@/features/library/ProjectContextMenu";
import { useRunProject } from "@/hooks/useRunProject";
import { api } from "@/lib/api";
import { formatShipScore, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

interface ProjectCardProps {
  project: Project;
  onOpen: (id: number) => void;
}

function shipScoreTone(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 70) return "text-ok";
  if (score >= 40) return "text-warn";
  return "text-muted-foreground";
}

export function ProjectCard({ project, onOpen }: ProjectCardProps) {
  const runProject = useRunProject();

  async function openIn(target: "editor" | "finder", event: React.MouseEvent) {
    event.stopPropagation();
    try {
      await api.openIn(target, project.id);
    } catch (error) {
      toast.error(`Failed to open ${target}`, {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function run(event: React.MouseEvent) {
    event.stopPropagation();
    runProject.mutate(project.id);
  }

  return (
    <ProjectContextMenu project={project}>
      <button
        type="button"
        onClick={() => onOpen(project.id)}
        className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-muted-foreground/40"
      >
        <div className="relative">
          <ScreenshotThumb
            screenshotPath={project.screenshotDesktop}
            framework={project.framework}
            name={project.name}
            projectId={project.id}
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-background/90 to-transparent p-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={run}
                  className="flex size-7 items-center justify-center rounded-md bg-card/90 text-foreground hover:bg-secondary"
                >
                  <PlayIcon className="size-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Run</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => openIn("editor", event)}
                  className="flex size-7 items-center justify-center rounded-md bg-card/90 text-foreground hover:bg-secondary"
                >
                  <CodeIcon className="size-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Open Code</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => openIn("finder", event)}
                  className="flex size-7 items-center justify-center rounded-md bg-card/90 text-foreground hover:bg-secondary"
                >
                  <FolderOpenIcon className="size-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Finder</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 p-3">
          <div className="flex items-center gap-1.5">
            <StatusBadge status={project.status} />
            <span className="truncate text-sm font-medium">{project.name}</span>
            {project.gitDirty && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <GitBranchIcon className="size-3 shrink-0 text-warn" strokeWidth={1.75} />
                </TooltipTrigger>
                <TooltipContent>Uncommitted changes</TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <FrameworkBadge framework={project.framework} />
              <span className="truncate text-xs text-muted-foreground">
                {relativeTime(project.lastModified)}
              </span>
            </div>
            <Badge variant="outline" className={cn("shrink-0 font-mono", shipScoreTone(project.shipScore))}>
              {formatShipScore(project.shipScore)}
            </Badge>
          </div>
        </div>
      </button>
    </ProjectContextMenu>
  );
}
