import { useEffect, useState } from "react";
import { ImagePlusIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodePeek } from "@/features/library/CodePeek";
import { useScreenshotImport } from "@/hooks/useScreenshotImport";

interface ScreenshotDropZoneProps {
  projectId: number;
  variant: "desktop" | "mobile";
}

export function ScreenshotDropZone({ projectId, variant }: ScreenshotDropZoneProps) {
  const { pickFile, importBlob, isPending } = useScreenshotImport(projectId, variant);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const file = Array.from(event.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith("image/"),
      );
      if (file) {
        event.preventDefault();
        importBlob(file);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [importBlob]);

  return (
    <button
      type="button"
      onClick={pickFile}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = Array.from(event.dataTransfer.files).find((f) => f.type.startsWith("image/"));
        if (file) importBlob(file);
      }}
      className={cn(
        "group relative flex aspect-[16/10] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed transition-colors duration-150 ease-out",
        dragging
          ? "border-brand bg-brand/5 text-foreground"
          : "border-border bg-card/40 text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
      )}
    >
      <CodePeek projectId={projectId} />
      <span className="relative z-10 flex items-center gap-1.5 rounded-md border border-border bg-background/85 px-2.5 py-1.5 text-[11px] font-medium text-foreground backdrop-blur-sm transition-colors duration-150 ease-out group-hover:bg-secondary">
        {isPending ? (
          <Loader2Icon className="size-3.5 animate-spin" strokeWidth={1.75} />
        ) : (
          <ImagePlusIcon className="size-3.5" strokeWidth={1.75} />
        )}
        {isPending ? "Adding…" : "Upload image"}
      </span>
      <span className="relative z-10 mt-1.5 text-[10px] text-muted-foreground/70">
        or paste / drag one here
      </span>
    </button>
  );
}
