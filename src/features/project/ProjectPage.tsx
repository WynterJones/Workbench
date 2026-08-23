import { useState } from "react";
import { ArrowLeftIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectMeta } from "@/features/project/ProjectMeta";
import { ProjectActions } from "@/features/project/ProjectActions";
import { ScreenshotHero } from "@/features/project/ScreenshotHero";
import { ScreenshotTour } from "@/features/project/ScreenshotTour";
import { ProjectTimeline } from "@/features/project/ProjectTimeline";
import { ShipScoreCard } from "@/features/project/ShipScoreCard";
import { ReadmePanel } from "@/features/project/ReadmePanel";
import { CommitList } from "@/features/project/CommitList";
import { StatusPicker } from "@/features/project/StatusPicker";
import { ProjectMediaPanel } from "@/features/media/ProjectMediaPanel";
import { ProjectVideos } from "@/features/project/ProjectVideos";
import { TodoList } from "@/features/project/TodoList";
import { RunLogPanel } from "@/features/project/RunLogPanel";
import { PortfolioPanel } from "@/features/portfolio/PortfolioPanel";
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
            <div className="flex items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="readme">README</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="commits">Commits</TabsTrigger>
              <TabsTrigger value="todos">TODOs</TabsTrigger>
              <TabsTrigger value="runlog">Run Log</TabsTrigger>
              <TabsTrigger
                value="portfolio"
                className="text-brand/80 hover:text-brand data-[state=active]:bg-brand/10 data-[state=active]:text-brand dark:data-[state=active]:border-brand/40 dark:data-[state=active]:bg-brand/10 dark:data-[state=active]:text-brand"
              >
                <SparklesIcon />
                AI Portfolio
              </TabsTrigger>
            </TabsList>
            <StatusPicker projectId={project.id} status={project.status} />
            </div>
            <TabsContent value="readme" className="mt-3 rounded-lg border border-border bg-card p-5">
              <ReadmePanel projectId={project.id} basePath={project.path} />
            </TabsContent>
            <TabsContent value="media" className="mt-3 rounded-lg border border-border bg-card p-5">
              <ProjectMediaPanel projectId={project.id} />
            </TabsContent>
            <TabsContent value="videos" className="mt-3 rounded-lg border border-border bg-card p-5">
              <ProjectVideos projectId={project.id} />
            </TabsContent>
            <TabsContent value="commits" className="mt-3 rounded-lg border border-border bg-card p-5">
              <CommitList projectId={project.id} projectPath={project.path} />
            </TabsContent>
            <TabsContent value="todos" className="mt-3 rounded-lg border border-border bg-card p-5">
              <TodoList projectId={project.id} />
            </TabsContent>
            <TabsContent value="runlog" className="mt-3 rounded-lg border border-border bg-card p-5">
              <RunLogPanel project={project} lastResult={lastResult} />
            </TabsContent>
            <TabsContent value="portfolio" className="mt-3">
              <PortfolioPanel projectId={project.id} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <ScreenshotHero project={project} />
          <ScreenshotTour project={project} />
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
