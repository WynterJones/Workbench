import { ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";
import { openUrl } from "@/lib/openUrl";
import type { PluginItem, PluginTone } from "@/hooks/usePluginData";

const TONE_DOT: Record<PluginTone, string> = {
  good: "bg-emerald-400",
  bad: "bg-red-400",
  warn: "bg-amber-400 animate-pulse",
  neutral: "bg-muted-foreground/40",
};

const TONE_TEXT: Record<PluginTone, string> = {
  good: "text-emerald-400",
  bad: "text-red-400",
  warn: "text-amber-400",
  neutral: "text-muted-foreground",
};

interface PluginItemRowProps {
  item: PluginItem;
}

export function PluginItemRow({ item }: PluginItemRowProps) {
  const interactive = Boolean(item.url);

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={() => item.url && openUrl(item.url)}
      onKeyDown={(event) => {
        if (item.url && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          openUrl(item.url);
        }
      }}
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors duration-150 ease-out",
        interactive && "cursor-pointer hover:border-muted-foreground/40 hover:bg-secondary/40",
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-full", TONE_DOT[item.tone])} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        <p className="truncate text-xs text-muted-foreground/70">
          {item.subtitle || item.source}
        </p>
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
        <span className={cn("font-mono text-[10px] uppercase tracking-wide", TONE_TEXT[item.tone])}>
          {item.status}
        </span>
        {item.meta && (
          <span className="font-mono text-[10px] text-muted-foreground/60">{item.meta}</span>
        )}
      </div>

      {item.timestamp && (
        <span className="hidden w-24 shrink-0 text-right font-mono text-[10px] text-muted-foreground/50 lg:block">
          {relativeTime(item.timestamp)}
        </span>
      )}

      {interactive && (
        <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
      )}
    </div>
  );
}
