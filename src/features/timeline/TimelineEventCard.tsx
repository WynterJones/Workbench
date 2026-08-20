import { FolderPlusIcon, GitCommitHorizontalIcon, SproutIcon } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { frameworkBrand } from "@/lib/brandIcons";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Framework } from "@/lib/types";
import type { TimelineEvent } from "@/hooks/useProjectTimeline";

const KIND_ICON = {
  "project-created": FolderPlusIcon,
  "first-commit": SproutIcon,
  commit: GitCommitHorizontalIcon,
};

interface TimelineEventCardProps {
  event: TimelineEvent;
  side: "left" | "right";
  visible: boolean;
  onOpen: () => void;
}

export function TimelineEventCard({ event, side, visible, onOpen }: TimelineEventCardProps) {
  const Icon = KIND_ICON[event.kind] ?? GitCommitHorizontalIcon;
  const brand = frameworkBrand(event.framework as Framework);
  const milestone = event.kind !== "commit";

  return (
    <div
      className={cn(
        "relative flex w-full items-start transition-all duration-500 ease-out md:w-1/2",
        side === "left" ? "md:self-start md:pr-8" : "md:self-end md:pl-8",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <span
        className={cn(
          "absolute top-4 hidden size-2.5 rounded-full ring-4 ring-background md:block",
          milestone ? "bg-brand" : "bg-muted-foreground/50",
          side === "left" ? "-right-[5px]" : "-left-[5px]",
        )}
      />

      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "min-w-0 flex-1 cursor-pointer rounded-lg border bg-card px-3.5 py-2.5 text-left transition-colors duration-150 ease-out hover:border-muted-foreground/40",
          milestone ? "border-brand/35" : "border-border",
        )}
      >
        <span className="flex items-center gap-2">
          {brand ? (
            <BrandIcon mark={brand} className="size-3.5" />
          ) : (
            <Icon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          )}
          <span className="truncate text-[13px] font-medium text-foreground">
            {event.projectName}
          </span>
          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
            {relativeTime(event.occurredAt)}
          </span>
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">{event.title}</span>
        {event.detail && (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/60">
            {event.detail}
          </span>
        )}
      </button>
    </div>
  );
}
