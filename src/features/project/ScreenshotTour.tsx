import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { CameraIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useSettings } from "@/hooks/useSettings";
import { startScreenshotTour, useTourReport } from "@/hooks/useScreenshotTour";
import type { Project } from "@/lib/types";

interface ScreenshotTourProps {
  project: Project;
}

function caption(name: string) {
  const bare = name.replace(/\.[a-z]+$/i, "").replace(/-/g, " ");
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

export function ScreenshotTour({ project }: ScreenshotTourProps) {
  const { data: settings } = useSettings();
  const { data } = usePortfolio(project.id);
  const [waiting, setWaiting] = useState(false);
  const [enlarged, setEnlarged] = useState<string | null>(null);
  const { data: report } = useTourReport(project.id, waiting);

  useEffect(() => {
    if (!report) return;
    setWaiting(false);
    if (report.ok) {
      toast.success(`Tour done — ${report.shots} screenshots`, {
        description: report.note ?? undefined,
      });
    } else {
      toast.error("The tour did not finish", { description: report.note ?? undefined });
    }
  }, [report]);

  async function start() {
    try {
      await startScreenshotTour(project.id, project.path, settings?.aiProvider ?? "claude-code");
      setWaiting(true);
      toast.success("Tour started", {
        description: `${settings?.aiProvider === "codex" ? "Codex" : "Claude Code"} is running ${project.name} in the terminal.`,
      });
    } catch (error) {
      toast.error("Could not start the tour", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const images = data?.images ?? [];

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Screenshots
          {images.length > 0 && <span className="ml-1.5 text-muted-foreground">{images.length}</span>}
        </p>
        <Button size="sm" variant="outline" onClick={start} disabled={waiting} className="cursor-pointer">
          {waiting ? <Loader2Icon className="animate-spin" /> : <CameraIcon />}
          {waiting ? "Touring…" : images.length > 0 ? "Re-take tour" : "Take a tour"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {waiting
          ? "The agent is running the app and sending shots back. They appear here as they land."
          : "An agent runs the app, walks its main screens, and sends the shots back to Workbench and the AI Portfolio."}
      </p>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setEnlarged(name)}
              className="cursor-pointer overflow-hidden rounded-md border border-border bg-secondary text-left"
            >
              <img
                src={convertFileSrc(`${data?.imagesDir}/${name}`)}
                alt={caption(name)}
                className="aspect-[16/10] w-full object-cover"
              />
              <p className="truncate px-2 py-1 text-[11px] text-muted-foreground">{caption(name)}</p>
            </button>
          ))}
        </div>
      )}

      <Dialog open={enlarged !== null} onOpenChange={(open) => !open && setEnlarged(null)}>
        <DialogContent className="max-w-5xl">
          <DialogTitle className="sr-only">{enlarged ? caption(enlarged) : ""}</DialogTitle>
          {enlarged && (
            <img
              src={convertFileSrc(`${data?.imagesDir}/${enlarged}`)}
              alt={caption(enlarged)}
              className="max-h-[80vh] w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
