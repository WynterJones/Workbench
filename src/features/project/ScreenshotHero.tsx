import { useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ExpandIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScreenshotDropZone } from "@/features/project/ScreenshotDropZone";
import type { Project } from "@/lib/types";

interface ScreenshotHeroProps {
  project: Project;
}

export function ScreenshotHero({ project }: ScreenshotHeroProps) {
  const [variant, setVariant] = useState<"desktop" | "mobile">("desktop");
  const [enlarged, setEnlarged] = useState(false);

  const path = variant === "desktop" ? project.screenshotDesktop : project.screenshotMobile;
  const hasBoth = Boolean(project.screenshotDesktop && project.screenshotMobile);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {hasBoth ? (
          <Tabs value={variant} onValueChange={(value) => setVariant(value as "desktop" | "mobile")}>
            <TabsList>
              <TabsTrigger value="desktop">Desktop</TabsTrigger>
              <TabsTrigger value="mobile">Mobile</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : (
          <span />
        )}
        {path && (
          <button
            type="button"
            onClick={() => setEnlarged(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ExpandIcon className="size-3" />
            Enlarge
          </button>
        )}
      </div>

      {path ? (
      <button
        type="button"
        onClick={() => setEnlarged(true)}
        className="flex max-h-[520px] min-h-[240px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-border bg-gradient-to-br from-secondary to-background"
      >
          <img
            src={convertFileSrc(path)}
            alt={`${project.name} ${variant} screenshot`}
            className="max-h-[520px] w-full object-contain"
          />
      </button>
      ) : (
        <ScreenshotDropZone projectId={project.id} variant={variant} />
      )}

      <Dialog open={enlarged} onOpenChange={setEnlarged}>
        <DialogContent className="max-w-5xl">
          <DialogTitle className="sr-only">{project.name} screenshot</DialogTitle>
          {path && (
            <img
              src={convertFileSrc(path)}
              alt={`${project.name} screenshot enlarged`}
              className="max-h-[80vh] w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
