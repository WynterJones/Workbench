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
      <span className="relative z-10 flex flex-col items-center gap-1 rounded-md bg-background/70 px-3 py-2 backdrop-blur-sm">
        {isPending ? (
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" strokeWidth={1.75} />
        ) : (
          <ImagePlusIcon
            className="size-4 text-muted-foreground transition-colors duration-150 ease-out group-hover:text-foreground"
            strokeWidth={1.75}
          />
        )}
        <span className="text-[10px] text-muted-foreground/70">
          {isPending ? "Adding…" : "Click, paste, or drag an image"}
        </span>
      </span>
    </button>
  );
}
