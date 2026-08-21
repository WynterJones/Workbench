import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ImagePlusIcon, Loader2Icon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortfolioImages } from "@/hooks/usePortfolio";

interface PortfolioShotsProps {
  projectId: number;
  imagesDir: string;
  images: string[];
}

export function PortfolioShots({ projectId, imagesDir, images }: PortfolioShotsProps) {
  const { add, pickFile, remove, isPending } = usePortfolioImages(projectId);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const file = Array.from(event.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith("image/"),
      );
      if (file) {
        event.preventDefault();
        add(file);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [add]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        The shots the write-up can use. Paste, drag them in, or pick a file.
      </p>

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
          Array.from(event.dataTransfer.files)
            .filter((file) => file.type.startsWith("image/"))
            .forEach((file) => add(file));
        }}
        className={cn(
          "flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed transition-colors duration-150 ease-out",
          dragging
            ? "border-brand bg-brand/5 text-foreground"
            : "border-border bg-card/40 text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
        )}
      >
        {isPending ? (
          <Loader2Icon className="size-4 animate-spin" strokeWidth={1.75} />
        ) : (
          <ImagePlusIcon className="size-4" strokeWidth={1.75} />
        )}
        <span className="text-xs">{isPending ? "Adding…" : "Click, paste, or drag images"}</span>
      </button>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {images.map((name) => (
            <div key={name} className="group relative overflow-hidden rounded-lg border border-border bg-card">
              <img
                src={convertFileSrc(`${imagesDir}/${name}`)}
                alt={name}
                className="aspect-[16/10] w-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(name)}
                aria-label={`Remove ${name}`}
                className="absolute right-1.5 top-1.5 hidden cursor-pointer rounded-md bg-background/80 p-1 text-muted-foreground backdrop-blur-sm hover:text-foreground group-hover:block"
              >
                <XIcon className="size-3.5" />
              </button>
              <p className="truncate px-2 py-1.5 font-mono text-[10px] text-muted-foreground">{name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
