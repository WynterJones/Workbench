import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLinkIcon, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectIcon } from "@/features/project/ProjectIcon";
import { api } from "@/lib/api";
import { openUrl } from "@/lib/openUrl";
import type { ProjectQuery } from "@/lib/types";

const QUERY: Omit<ProjectQuery, "shelf"> = {
  search: "",
  frameworks: [],
  tags: [],
  sort: "name",
};

export function ProjectLinksDialog() {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["projects", "all-links"],
    queryFn: async () => {
      const projects = await Promise.all([
        api.listProjects({ ...QUERY, shelf: "all" }),
        api.listProjects({ ...QUERY, shelf: "archived" }),
      ]);
      return projects.flat().filter((project) => project.homepage);
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LinkIcon />
          View Links
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Project links</DialogTitle>
          <DialogDescription>Every saved project link, ready to open.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
          {isLoading && [0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-14 w-full" />)}
          {isError && <p className="py-8 text-center text-sm text-muted-foreground">Could not load project links.</p>}
          {!isLoading && !isError && data?.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No project links saved yet.</p>
          )}
          {data?.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => openUrl(project.homepage as string)}
              className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left hover:border-border hover:bg-card"
            >
              <ProjectIcon project={project} className="size-8" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{project.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {project.homepage?.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </span>
              </span>
              <ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
