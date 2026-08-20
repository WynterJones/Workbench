import type { ReactNode } from "react";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CodeIcon,
  CopyIcon,
  ExternalLinkIcon,
  FolderOpenIcon,
  TerminalIcon,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useArchiveProject } from "@/hooks/useProjects";
import type { Project } from "@/lib/types";

interface ProjectContextMenuProps {
  project: Project;
  children: ReactNode;
}

export function ProjectContextMenu({ project, children }: ProjectContextMenuProps) {
  const archiveProject = useArchiveProject();

  async function openIn(target: "finder" | "terminal" | "editor" | "github") {
    try {
      await api.openIn(target, project.id);
    } catch (error) {
      toast.error(`Failed to open ${target}`, {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function copyPath() {
    await navigator.clipboard.writeText(project.path);
    toast.success("Path copied");
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={() => openIn("finder")}>
          <FolderOpenIcon />
          Open in Finder
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => openIn("terminal")}>
          <TerminalIcon />
          Open in Terminal
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => openIn("editor")}>
          <CodeIcon />
          Open in Editor
        </ContextMenuItem>
        <ContextMenuItem onSelect={copyPath}>
          <CopyIcon />
          Copy Path
        </ContextMenuItem>
        {project.gitRemote && (
          <ContextMenuItem onSelect={() => openIn("github")}>
            <ExternalLinkIcon />
            Open GitHub
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          variant={project.archived ? "default" : "destructive"}
          onSelect={() => archiveProject.mutate({ id: project.id, archived: !project.archived })}
        >
          {project.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
          {project.archived ? "Unarchive" : "Archive"}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
