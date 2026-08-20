import { FolderPlusIcon, GitCommitHorizontalIcon, SproutIcon } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { frameworkBrand } from "@/lib/brandIcons";
import { cn } from "@/lib/utils";
import type { Framework } from "@/lib/types";
import { revealStyle } from "@/features/timeline/revealStyle";
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
  revealed: number;
  onOpen: () => void;
}

export function TimelineRow({ event, index, revealed, onOpen }: TimelineRowProps) {
  const reveal = revealStyle(index, revealed);
  const Icon = KIND_ICON[event.kind] ?? GitCommitHorizontalIcon;
  const brand = frameworkBrand(event.framework as Framework);
  const milestone = event.kind !== "commit";

  return (
    <button
      type="button"
      data-timeline-index={index}
      onClick={onOpen}
      className={cn(
        "group relative flex w-full cursor-pointer items-center gap-3 rounded-lg pr-3 text-left transition-[opacity,transform] duration-[600ms] ease-out hover:bg-secondary/40 motion-reduce:transition-none",
        milestone ? "py-2.5 pl-16" : "py-1.5 pl-24",
        !reveal.interactive && "pointer-events-none",
      )}
      style={{
        opacity: reveal.opacity,
        transform: `translate3d(0, ${reveal.translateY}px, 0)`,
      }}
    >
      <span
        className={cn(
          "absolute rounded-full ring-4 ring-background transition-colors duration-300",
          milestone
            ? "left-[29px] size-2.5 bg-brand"
            : "left-[32px] size-1.5 bg-muted-foreground/35 group-hover:bg-muted-foreground",
        )}
      />

      {!milestone && (
        <span aria-hidden className="absolute left-[38px] h-px w-[50px] bg-border" />
      )}

      <span
        className={cn(
          "absolute left-0 w-[22px] shrink-0 text-right font-mono text-[11px] tabular-nums",
          milestone ? "text-brand" : "text-muted-foreground/60",
        )}
      >
        {dayNumber(event.occurredAt)}
      </span>

      {milestone ? (
        <>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary">
            {brand ? (
              <BrandIcon mark={brand} className="size-4" />
            ) : (
              <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
            )}
          </span>
          <span className="truncate text-sm font-semibold text-foreground">
            {event.projectName}
          </span>
          <span className="shrink-0 rounded border border-brand/40 px-1.5 py-0.5 text-[10px] font-medium text-brand">
            {event.kind === "project-created" ? "created" : "first commit"}
          </span>
          <span className="min-w-0 flex-1" />
        </>
      ) : (
        <>
          <span className="w-28 shrink-0 truncate text-[11px] text-muted-foreground/70">
            {event.projectName}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {event.title}
          </span>
        </>
      )}

      <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground/50 sm:block">
        {dayLabel(event.occurredAt)}
      </span>
    </button>
  );
}
