import { CodeIcon, FolderOpenIcon, GitBranchIcon, PlayIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScreenshotThumb } from "@/features/library/ScreenshotThumb";
import { FrameworkBadge } from "@/features/library/FrameworkBadge";
import { ProjectContextMenu } from "@/features/library/ProjectContextMenu";
import { ProjectIcon } from "@/features/project/ProjectIcon";
import { useRunProject } from "@/hooks/useRunProject";
import { api } from "@/lib/api";
import { formatShipScore, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

interface ProjectCardProps {
  project: Project;
  view?: "grid" | "list";
  onOpen: (id: number) => void;
}

function shipScoreTone(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 70) return "text-ok";
  if (score >= 40) return "text-warn";
  return "text-muted-foreground";
}

export function ProjectCard({ project, view = "grid", onOpen }: ProjectCardProps) {
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
        className={cn(
          "group flex overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-muted-foreground/40",
          view === "list" ? "h-36 min-w-0 flex-row" : "flex-col"
        )}
      >
        <div className={cn("relative", view === "list" && "w-[42%] shrink-0")}>
          <ScreenshotThumb
            screenshotPath={project.screenshotDesktop}
            framework={project.framework}
            name={project.name.replace(/^\.+/, "")}
            projectId={project.id}
            className={view === "list" ? "h-full aspect-auto rounded-l-lg rounded-tr-none" : undefined}
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

        <div className={cn("flex flex-col gap-1.5 p-3", view === "list" && "min-w-0 flex-1 justify-center")}>
          <div className="flex items-center gap-1.5">
            <ProjectIcon project={project} className={view === "list" ? "size-6" : "size-5"} />
            <span className={cn("truncate font-medium", view === "list" ? "text-base" : "text-sm")}>
              {project.name.replace(/^\.+/, "")}
            </span>
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
          {project.tags.length > 0 && (
            <div className="flex min-w-0 items-center gap-1 overflow-hidden">
              {project.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="max-w-28 truncate px-1.5 py-0 text-[10px]">
                  {tag}
                </Badge>
              ))}
              {project.tags.length > 2 && (
                <span className="shrink-0 text-[10px] text-muted-foreground">+{project.tags.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </button>
    </ProjectContextMenu>
  );
}
