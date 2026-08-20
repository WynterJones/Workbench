import { convertFileSrc } from "@tauri-apps/api/core";
import { CopyIcon, HeartIcon, PlayIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFavoriteMedia } from "@/lib/favoriteMedia";
import type { MediaItem } from "@/hooks/useMedia";

interface MediaTileProps {
  item: MediaItem;
  onOpen: () => void;
}

export function MediaTile({ item, onOpen }: MediaTileProps) {
  const paths = useFavoriteMedia((s) => s.paths);
  const toggle = useFavoriteMedia((s) => s.toggle);
  const favorite = paths.includes(item.path);
  const src = convertFileSrc(item.path);

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={onOpen}
        className="block aspect-square w-full cursor-pointer bg-secondary/40"
        aria-label={`Open ${item.name}`}
      >
        {item.kind === "image" ? (
          <img
            src={src}
            alt={item.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex size-full items-center justify-center">
            <video src={src} muted preload="metadata" className="size-full object-cover" />
            <PlayIcon className="absolute size-7 text-foreground/80" strokeWidth={2} />
          </span>
        )}
      </button>

      <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(item.path);
            toast.success("Path copied");
          }}
          aria-label={`Copy path to ${item.name}`}
          title="Copy path"
          className="cursor-pointer rounded-md bg-background/70 p-1.5 text-muted-foreground opacity-0 backdrop-blur-sm transition-colors duration-150 ease-out hover:text-foreground group-hover:opacity-100"
        >
          <CopyIcon className="size-3.5" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => toggle(item.path)}
          aria-label={favorite ? `Unfavorite ${item.name}` : `Favorite ${item.name}`}
          title={favorite ? "Remove from favorites" : "Add to favorites"}
          className={cn(
            "cursor-pointer rounded-md p-1.5 backdrop-blur-sm transition-colors duration-150 ease-out",
            favorite
              ? "bg-background/80 text-brand"
              : "bg-background/70 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100",
          )}
        >
          <HeartIcon
            className="size-3.5"
            fill={favorite ? "currentColor" : "none"}
            strokeWidth={2}
          />
        </button>
      </div>

      <p className="truncate border-t border-border px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
        {item.relative}
      </p>
    </div>
  );
}
