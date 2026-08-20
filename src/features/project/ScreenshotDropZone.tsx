import { useEffect, useState } from "react";
import { ImagePlusIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
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
        "flex aspect-[16/10] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed transition-colors duration-150 ease-out",
        dragging
          ? "border-brand bg-brand/5 text-foreground"
          : "border-border bg-card/40 text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
      )}
    >
      {isPending ? (
        <Loader2Icon className="size-6 animate-spin" strokeWidth={1.5} />
      ) : (
        <ImagePlusIcon className="size-7" strokeWidth={1.25} />
      )}
      <span className="text-sm font-medium">
        {isPending ? "Adding…" : "No screenshot yet"}
      </span>
      <span className="max-w-xs text-center text-xs text-muted-foreground">
        Run the project to capture one, or click to choose an image — you can also paste or drag one
        here.
      </span>
    </button>
  );
}
