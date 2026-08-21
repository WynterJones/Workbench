import { useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ChevronLeftIcon, ChevronRightIcon, CopyIcon, HeartIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirmUnfavorite } from "@/lib/favoriteMedia";
import { formatBytes } from "@/features/files/lib/format";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/hooks/useMedia";

interface MediaLightboxProps {
  items: MediaItem[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export function MediaLightbox({ items, index, onIndexChange, onClose }: MediaLightboxProps) {
  const item = index === null ? undefined : items[index];
  const favoriteAction = useConfirmUnfavorite(item?.path ?? "");

  useEffect(() => {
    if (index === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onIndexChange(Math.min(items.length - 1, (index ?? 0) + 1));
      if (event.key === "ArrowLeft") onIndexChange(Math.max(0, (index ?? 0) - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onClose, onIndexChange]);

  if (index === null || !item) return null;

  const src = convertFileSrc(item.path);
  const { favorite, confirming, act } = favoriteAction;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/96 backdrop-blur-sm">
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            {item.relative} · {formatBytes(item.sizeBytes)}
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="cursor-pointer"
          onClick={() => {
            navigator.clipboard.writeText(item.path);
            toast.success("Path copied");
          }}
        >
          <CopyIcon />
          Copy path
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={cn(
            "cursor-pointer",
            confirming && "animate-pulse border-destructive/50 text-destructive motion-reduce:animate-none",
            favorite && !confirming && "text-brand",
          )}
          onClick={act}
        >
          <HeartIcon fill={favorite ? "currentColor" : "none"} />
          {confirming ? "Click again to remove" : favorite ? "Favorited" : "Favorite"}
        </Button>
        <Button size="sm" variant="ghost" className="cursor-pointer" onClick={onClose}>
          <XIcon />
        </Button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-6">
        <Button
          size="icon"
          variant="ghost"
          className="absolute left-4 cursor-pointer"
          disabled={index === 0}
          onClick={() => onIndexChange(index - 1)}
          aria-label="Previous"
        >
          <ChevronLeftIcon />
        </Button>

        {item.kind === "image" ? (
          <img src={src} alt={item.name} className="max-h-full max-w-full rounded-lg object-contain" />
        ) : (
          <video src={src} controls autoPlay className="max-h-full max-w-full rounded-lg" />
        )}

        <Button
          size="icon"
          variant="ghost"
          className="absolute right-4 cursor-pointer"
          disabled={index === items.length - 1}
          onClick={() => onIndexChange(index + 1)}
          aria-label="Next"
        >
          <ChevronRightIcon />
        </Button>
      </div>

      <p className="shrink-0 border-t border-border py-2 text-center font-mono text-[11px] text-muted-foreground">
        {index + 1} / {items.length}
      </p>
    </div>
  );
}
