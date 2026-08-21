import { useEffect, useState } from "react";
import { MediaTile } from "@/features/media/MediaTile";
import { MediaLightbox } from "@/features/media/MediaLightbox";
import type { MediaItem } from "@/hooks/useMedia";
import type { GalleryView } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";

interface MediaGridProps {
  items: MediaItem[];
  view?: GalleryView;
  columns?: number;
}

export function MediaGrid({ items, view = "grid", columns }: MediaGridProps) {
  const [open, setOpen] = useState<number | null>(null);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const visibleItems = items.filter((item) => !failed.has(item.path));

  useEffect(() => setFailed(new Set()), [items]);

  return (
    <>
      <div
        className={cn(
          "grid gap-3",
          view === "grid" ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-1 xl:grid-cols-2",
        )}
        style={view === "grid" && columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      >
        {visibleItems.map((item, index) => (
          <MediaTile
            key={item.path}
            item={item}
            view={view}
            onOpen={() => setOpen(index)}
            onLoadError={() => setFailed((current) => new Set(current).add(item.path))}
          />
        ))}
      </div>
      <MediaLightbox
        items={visibleItems}
        index={open}
        onIndexChange={setOpen}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
