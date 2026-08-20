import { useState } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectMeta } from "@/features/project/ProjectMeta";
import { ProjectActions } from "@/features/project/ProjectActions";
import { ScreenshotHero } from "@/features/project/ScreenshotHero";
import { ProjectTimeline } from "@/features/project/ProjectTimeline";
import { ShipScoreCard } from "@/features/project/ShipScoreCard";
import { ReadmePanel } from "@/features/project/ReadmePanel";
import { CommitList } from "@/features/project/CommitList";
import { TodoList } from "@/features/project/TodoList";
import { RunLogPanel } from "@/features/project/RunLogPanel";
import { useProject } from "@/hooks/useProject";
import { useAppStore } from "@/lib/store";
import type { RunResult } from "@/lib/types";

export function ProjectPage() {
  const selectedProjectId = useAppStore((state) => state.selectedProjectId);
  const closeProject = useAppStore((state) => state.closeProject);
  const { data: project, isLoading } = useProject(selectedProjectId);
  const [lastResult, setLastResult] = useState<RunResult | null>(null);

  if (isLoading || !project) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Button variant="ghost" size="sm" onClick={closeProject} className="-ml-2">
        <ArrowLeftIcon />
        Back to library
      </Button>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="space-y-4">
            <ProjectMeta project={project} />
            <ProjectActions project={project} onRunResult={setLastResult} />
          </div>
          <Tabs defaultValue="readme">
            <TabsList>
              <TabsTrigger value="readme">README</TabsTrigger>
              <TabsTrigger value="commits">Commits</TabsTrigger>
              <TabsTrigger value="todos">TODOs</TabsTrigger>
              <TabsTrigger value="runlog">Run Log</TabsTrigger>
            </TabsList>
            <TabsContent value="readme" className="mt-3 rounded-lg border border-border bg-card p-5">
              <ReadmePanel projectId={project.id} basePath={project.path} />
            </TabsContent>
            <TabsContent value="commits" className="mt-3 rounded-lg border border-border bg-card p-5">
              <CommitList projectId={project.id} />
            </TabsContent>
            <TabsContent value="todos" className="mt-3 rounded-lg border border-border bg-card p-5">
              <TodoList projectId={project.id} />
            </TabsContent>
            <TabsContent value="runlog" className="mt-3 rounded-lg border border-border bg-card p-5">
              <RunLogPanel project={project} lastResult={lastResult} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <ScreenshotHero project={project} />
          <ShipScoreCard projectId={project.id} />
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="mb-3 text-sm font-medium">Timeline</p>
            <ProjectTimeline project={project} />
          </div>
        </div>
      </div>
    </div>
  );
}
