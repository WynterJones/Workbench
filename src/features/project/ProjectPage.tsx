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

      <ProjectMeta project={project} />
      <ProjectActions project={project} onRunResult={setLastResult} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ScreenshotHero project={project} />
          <Tabs defaultValue="readme">
            <TabsList>
              <TabsTrigger value="readme">README</TabsTrigger>
              <TabsTrigger value="todos">TODOs</TabsTrigger>
              <TabsTrigger value="runlog">Run Log</TabsTrigger>
            </TabsList>
            <TabsContent value="readme">
              <ReadmePanel readmeSummary={project.readmeSummary} />
            </TabsContent>
            <TabsContent value="todos">
              <TodoList projectId={project.id} />
            </TabsContent>
            <TabsContent value="runlog">
              <RunLogPanel project={project} lastResult={lastResult} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <ShipScoreCard projectId={project.id} />
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="mb-3 text-sm font-medium">Timeline</p>
            <ProjectTimeline projectId={project.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
