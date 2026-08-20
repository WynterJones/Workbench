import { useState } from "react";
import { MediaTile } from "@/features/media/MediaTile";
import { MediaLightbox } from "@/features/media/MediaLightbox";
import type { MediaItem } from "@/hooks/useMedia";

interface MediaGridProps {
  items: MediaItem[];
}

export function MediaGrid({ items }: MediaGridProps) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item, index) => (
          <MediaTile key={item.path} item={item} onOpen={() => setOpen(index)} />
        ))}
      </div>
      <MediaLightbox
        items={items}
        index={open}
        onIndexChange={setOpen}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
