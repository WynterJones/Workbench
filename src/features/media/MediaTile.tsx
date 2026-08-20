import { convertFileSrc } from "@tauri-apps/api/core";
import { HeartIcon, PlayIcon } from "lucide-react";
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

      <button
        type="button"
        onClick={() => toggle(item.path)}
        aria-label={favorite ? `Unfavorite ${item.name}` : `Favorite ${item.name}`}
        className={cn(
          "absolute right-1.5 top-1.5 cursor-pointer rounded-md p-1.5 backdrop-blur-sm transition-colors duration-150 ease-out",
          favorite
            ? "bg-background/80 text-brand"
            : "bg-background/60 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100",
        )}
      >
        <HeartIcon className="size-3.5" fill={favorite ? "currentColor" : "none"} strokeWidth={2} />
      </button>

      <p className="truncate border-t border-border px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
        {item.relative}
      </p>
    </div>
  );
}
