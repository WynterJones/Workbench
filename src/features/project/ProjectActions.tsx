import { useState } from "react";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CodeIcon,
  FolderOpenIcon,
  GlobeIcon,
  PlayIcon,
  CameraIcon,
  SparklesIcon,
  TerminalIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AiLaunchDialog } from "@/features/project/AiLaunchDialog";
import { TrustDialog } from "@/features/project/TrustDialog";
import { useQueryClient } from "@tanstack/react-query";
import { useArchiveProject } from "@/hooks/useProjects";
import { useRunProject } from "@/hooks/useRunProject";
import { api } from "@/lib/api";
import type { Project, RunResult } from "@/lib/types";

interface ProjectActionsProps {
  project: Project;
  onRunResult?: (result: RunResult) => void;
}

export function ProjectActions({ project, onRunResult }: ProjectActionsProps) {
  const runProject = useRunProject();
  const archiveProject = useArchiveProject();
  const [aiOpen, setAiOpen] = useState(false);
  const [trustOpen, setTrustOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
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
    if (!project.trusted) {
      setTrustOpen(true);
      return;
    }
    runProject.mutate(project.id, {
      onSuccess: (result) => onRunResult?.(result),
    });
  }

  async function trustAndRun() {
    try {
      await api.trustProject(project.id, true);
      await queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      setTrustOpen(false);
      runProject.mutate(project.id, {
        onSuccess: (result) => onRunResult?.(result),
      });
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
      <Button size="sm" onClick={run} disabled={runProject.isPending}>
        <PlayIcon />
        {runProject.isPending ? "Running…" : "Run"}
      </Button>
      <Button size="sm" variant="outline" onClick={screenshot} disabled={capturing} className="cursor-pointer">
        <CameraIcon />
        {capturing ? "Capturing…" : "Screenshot"}
      </Button>
      <Button size="sm" variant="outline" onClick={() => openIn("editor")}>
        <CodeIcon />
        Open Code
      </Button>
      <Button size="sm" variant="outline" onClick={() => openIn("browser")} disabled={!project.runUrl}>
        <GlobeIcon />
        Open Browser
      </Button>
      <Button size="sm" variant="outline" onClick={() => openIn("finder")}>
        <FolderOpenIcon />
        Finder
      </Button>
      <Button size="sm" variant="outline" onClick={() => openIn("terminal")}>
        <TerminalIcon />
        Terminal
      </Button>
      <Button size="sm" variant="outline" onClick={() => setAiOpen(true)}>
        <SparklesIcon />
        Continue with AI
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => archiveProject.mutate({ id: project.id, archived: !project.archived })}
      >
        {project.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
        {project.archived ? "Unarchive" : "Archive"}
      </Button>

      <AiLaunchDialog project={project} open={aiOpen} onOpenChange={setAiOpen} />
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
