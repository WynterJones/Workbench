import { useState } from "react";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CodeIcon,
  EllipsisIcon,
  FolderOpenIcon,
  GlobeIcon,
  PlayIcon,
  SquareIcon,
  CameraIcon,
  Trash2Icon,
  SparklesIcon,
  TerminalIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AiLaunchDialog } from "@/features/project/AiLaunchDialog";
import { TrustDialog } from "@/features/project/TrustDialog";
import { RunFixDialog } from "@/features/project/RunFixDialog";
import { ManualRunDialog } from "@/features/project/ManualRunDialog";
import { DeleteProjectDialog } from "@/features/project/DeleteProjectDialog";
import { useQueryClient } from "@tanstack/react-query";
import { useArchiveProject } from "@/hooks/useProjects";
import { useRunProject, useStopProject } from "@/hooks/useRunProject";
import { api } from "@/lib/api";
import { manualRun } from "@/lib/manualRun";
import type { Project, RunResult } from "@/lib/types";

interface ProjectActionsProps {
  project: Project;
  onRunResult?: (result: RunResult) => void;
}

export function ProjectActions({ project, onRunResult }: ProjectActionsProps) {
  const [failure, setFailure] = useState<RunResult | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const guide = manualRun(project.framework);
  const manualOnly = Boolean(guide && !project.runCmd);
  const runProject = useRunProject(setFailure);
  const stopProject = useStopProject();
  const running = project.status === "running";
  const archiveProject = useArchiveProject();
  const [aiOpen, setAiOpen] = useState(false);
  const [trustOpen, setTrustOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  async function openIn(target: "editor" | "browser" | "finder" | "terminal") {
    try {
      await api.openIn(target, project.id);
    } catch (error) {
      toast.error(`Failed to open ${target}`, {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function run() {
    if (manualOnly) {
      setManualOpen(true);
      return;
    }
    if (!project.trusted) {
      setTrustOpen(true);
      return;
    }
    runProject.mutate(project.id, { onSuccess: (result) => onRunResult?.(result) });
  }

  async function trustAndRun() {
    try {
      await api.trustProject(project.id, true);
      await queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      setTrustOpen(false);
      runProject.mutate(project.id, { onSuccess: (result) => onRunResult?.(result) });
    } catch (error) {
      toast.error("Could not trust project", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function screenshot() {
    if (!project.trusted) {
      setTrustOpen(true);
      return;
    }
    setCapturing(true);
    try {
      await api.captureProject(project.id);
      await queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      toast.success("Screenshot captured");
    } catch (error) {
      toast.error("Screenshot failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setCapturing(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {running ? (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => stopProject.mutate(project.id)}
            disabled={stopProject.isPending}
            className="cursor-pointer border-emerald-500/40 text-emerald-400 hover:text-emerald-300"
          >
            <SquareIcon />
            {stopProject.isPending ? "Stopping…" : "Stop server"}
          </Button>
          {project.runUrl && (
            <Button size="sm" onClick={() => openIn("browser")} className="cursor-pointer">
              <GlobeIcon />
              {project.runUrl.replace(/^https?:\/\//, "")}
            </Button>
          )}
        </>
      ) : (
        <Button size="sm" onClick={run} disabled={runProject.isPending}>
          <PlayIcon />
          {manualOnly ? "How to run" : runProject.isPending ? "Starting…" : "Run"}
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={screenshot} disabled={capturing} className="cursor-pointer">
        <CameraIcon />
        {capturing ? "Capturing…" : "Screenshot"}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setAiOpen(true)} className="cursor-pointer">
        <SparklesIcon />
        Continue with AI
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="cursor-pointer">
            <EllipsisIcon />
            More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => openIn("editor")} className="cursor-pointer">
            <CodeIcon />
            Open in editor
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openIn("browser")}
            disabled={!project.runUrl}
            className="cursor-pointer"
          >
            <GlobeIcon />
            Open in browser
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openIn("finder")} className="cursor-pointer">
            <FolderOpenIcon />
            Reveal in Finder
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openIn("terminal")} className="cursor-pointer">
            <TerminalIcon />
            Open terminal here
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => archiveProject.mutate({ id: project.id, archived: !project.archived })}
            className="cursor-pointer"
          >
            {project.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
            {project.archived ? "Unarchive project" : "Archive project"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            variant="destructive"
            className="cursor-pointer"
          >
            <Trash2Icon />
            Delete project…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {guide && (
        <ManualRunDialog
          project={project}
          guide={guide}
          open={manualOpen}
          onOpenChange={setManualOpen}
        />
      )}
      <RunFixDialog
        project={project}
        reason={failure?.reason ?? null}
        logTail={failure?.logTail ?? ""}
        open={failure !== null}
        onOpenChange={(open) => !open && setFailure(null)}
      />
      <AiLaunchDialog project={project} open={aiOpen} onOpenChange={setAiOpen} />
      <DeleteProjectDialog project={project} open={deleteOpen} onOpenChange={setDeleteOpen} />
      <TrustDialog
        project={project}
        open={trustOpen}
        onOpenChange={setTrustOpen}
        onConfirm={trustAndRun}
        pending={runProject.isPending}
      />
    </div>
  );
}
