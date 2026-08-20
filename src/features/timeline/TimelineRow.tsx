import { FolderPlusIcon, GitCommitHorizontalIcon, SproutIcon } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { frameworkBrand } from "@/lib/brandIcons";
import { cn } from "@/lib/utils";
import type { Framework } from "@/lib/types";
import type { TimelineEvent } from "@/hooks/useProjectTimeline";

const KIND_ICON = {
  "project-created": FolderPlusIcon,
  "first-commit": SproutIcon,
  commit: GitCommitHorizontalIcon,
};

function dayNumber(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return String(date.getDate()).padStart(2, "0");
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

interface TimelineRowProps {
  event: TimelineEvent;
  index: number;
  visible: boolean;
  onOpen: () => void;
}

export function TimelineRow({ event, index, visible, onOpen }: TimelineRowProps) {
  const Icon = KIND_ICON[event.kind] ?? GitCommitHorizontalIcon;
  const brand = frameworkBrand(event.framework as Framework);
  const milestone = event.kind !== "commit";

  return (
    <button
      type="button"
      data-timeline-index={index}
      onClick={onOpen}
      className={cn(
        "group relative flex w-full cursor-pointer items-center gap-4 rounded-lg py-2 pl-16 pr-3 text-left transition-all duration-300 ease-out hover:bg-secondary/40",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-1 opacity-0",
      )}
    >
      <span
        className={cn(
          "absolute left-[30px] size-2 rounded-full ring-4 ring-background transition-colors duration-300",
          milestone ? "bg-brand" : "bg-muted-foreground/40 group-hover:bg-muted-foreground",
        )}
      />

      <span
        className={cn(
          "absolute left-0 w-[22px] shrink-0 text-right font-mono text-[11px] tabular-nums",
          milestone ? "text-brand" : "text-muted-foreground/60",
        )}
      >
        {dayNumber(event.occurredAt)}
      </span>

      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary/60">
        {brand ? (
          <BrandIcon mark={brand} className="size-3.5" />
        ) : (
          <Icon className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
        )}
      </span>

      <span className="w-32 shrink-0 truncate text-[13px] font-medium text-foreground">
        {event.projectName}
      </span>

      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{event.title}</span>

      <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground/50 sm:block">
        {dayLabel(event.occurredAt)}
      </span>
    </button>
  );
}
