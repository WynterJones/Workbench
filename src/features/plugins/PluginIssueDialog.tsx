import { ClipboardCopyIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { issuePrompt } from "@/lib/issuePrompt";
import { openUrl } from "@/lib/openUrl";
import { relativeTime } from "@/lib/format";
import { usePluginItemDetail } from "@/hooks/usePluginData";
import type { PluginItem } from "@/hooks/usePluginData";

interface PluginIssueDialogProps {
  pluginId: string;
  item: PluginItem | null;
  onOpenChange: (open: boolean) => void;
}

export function PluginIssueDialog({ pluginId, item, onOpenChange }: PluginIssueDialogProps) {
  const { data, isLoading, isError, error } = usePluginItemDetail(pluginId, item?.id ?? null);

  if (!item) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="break-words pr-6 text-base leading-snug">{item.title}</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {[item.source, item.subtitle, item.meta].filter(Boolean).join(" · ")}
            {item.timestamp && ` · last seen ${relativeTime(item.timestamp)}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading && <Skeleton className="h-40 w-full rounded-lg" />}

        {isError && (
          <p className="rounded-lg border border-border px-3 py-2 text-xs text-red-400">
            {error instanceof Error ? error.message : String(error)}
          </p>
        )}

        {data && (
          <div className="max-h-[50vh] space-y-3 overflow-y-auto">
            <p className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm break-words">
              {data.summary}
            </p>

            {data.request && (
              <p className="font-mono text-xs break-all text-muted-foreground">{data.request}</p>
            )}

            {data.frames.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Stack
                </p>
                <ol className="space-y-0.5 rounded-lg border border-border px-3 py-2">
                  {data.frames.map((frame) => (
                    <li key={frame} className="font-mono text-xs break-all text-muted-foreground">
                      {frame}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {data.tags.length > 0 && (
              <p className="flex flex-wrap gap-1.5">
                {data.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          {item.url && (
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer gap-1.5"
              onClick={() => openUrl(item.url!)}
            >
              <ExternalLinkIcon className="size-3.5" />
              Open in Sentry
            </Button>
          )}
          <Button
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={() => {
              navigator.clipboard.writeText(issuePrompt(item, data));
              toast.success("Prompt copied");
            }}
          >
            <ClipboardCopyIcon className="size-3.5" />
            Copy as prompt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
