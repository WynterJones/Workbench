import { PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SPEEDS = [1, 2, 4];

interface TimelineControlsProps {
  playing: boolean;
  speed: number;
  revealed: number;
  total: number;
  onToggle: () => void;
  onRestart: () => void;
  onSpeed: (speed: number) => void;
}

export function TimelineControls({
  playing,
  speed,
  revealed,
  total,
  onToggle,
  onRestart,
  onSpeed,
}: TimelineControlsProps) {
  const progress = total === 0 ? 0 : Math.min(100, (revealed / total) * 100);

  return (
    <div className="sticky top-0 z-10 -mx-6 mb-6 flex items-center gap-3 border-b border-border bg-background/95 px-6 py-2.5 backdrop-blur">
      <Button size="sm" onClick={onToggle} className="cursor-pointer">
        {playing ? <PauseIcon /> : <PlayIcon />}
        {playing ? "Pause" : "Play"}
      </Button>
      <Button size="sm" variant="outline" onClick={onRestart} className="cursor-pointer">
        <RotateCcwIcon />
      </Button>

      <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
        {SPEEDS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSpeed(option)}
            className={cn(
              "cursor-pointer rounded px-2 py-0.5 font-mono text-[11px] transition-colors duration-150 ease-out",
              speed === option
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option}x
          </button>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
        {revealed.toLocaleString()} / {total.toLocaleString()}
      </span>
    </div>
  );
}
