import { ExternalLinkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { openUrl } from "@/lib/openUrl";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePluginSourceMembers } from "@/hooks/usePluginData";
import type { PluginItem, PluginTone } from "@/hooks/usePluginData";

const TONE_DOT: Record<PluginTone, string> = {
  good: "bg-emerald-400",
  bad: "bg-red-400",
  warn: "bg-amber-400 animate-pulse",
  neutral: "bg-muted-foreground/40",
};

interface PluginServicesDialogProps {
  item: PluginItem | null;
  deployments: PluginItem[];
  onOpenChange: (open: boolean) => void;
}

export function PluginServicesDialog({
  item,
  deployments,
  onOpenChange,
}: PluginServicesDialogProps) {
  const projectId = item?.sourceId ?? null;
  const { data, isLoading, isError, error } = usePluginSourceMembers("railway", projectId);

  if (!item) return null;

  const latest = (service: string) =>
    deployments.find((deployment) => deployment.title === service);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-6 text-base leading-snug">{item.source}</DialogTitle>
          <DialogDescription className="text-xs">
            Services in this Railway project
          </DialogDescription>
        </DialogHeader>

        {isLoading && <Skeleton className="h-28 w-full rounded-lg" />}

        {isError && (
          <p className="rounded-lg border border-border px-3 py-2 text-xs text-red-400">
            {error instanceof Error ? error.message : String(error)}
          </p>
        )}

        {data && data.length === 0 && (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            This project has no services yet.
          </p>
        )}

        {data && data.length > 0 && (
          <ul className="max-h-[50vh] space-y-1.5 overflow-y-auto">
            {data.map((service) => {
              const deployment = latest(service.name);
              return (
                <li
                  key={service.id}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      TONE_DOT[deployment?.tone ?? "neutral"],
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{service.name}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground/60">
                      {deployment?.status ?? "no deployment in the last five"}
                      {deployment?.timestamp && ` · ${relativeTime(deployment.timestamp)}`}
                    </p>
                  </div>
                  {deployment?.url && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title="Open the deployed site"
                      onClick={() => openUrl(deployment.url!)}
                      className="cursor-pointer"
                    >
                      <ExternalLinkIcon className="size-3.5" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {projectId && (
          <Button
            size="sm"
            className="cursor-pointer"
            onClick={() => openUrl(`https://railway.com/project/${projectId}`)}
          >
            <ExternalLinkIcon />
            Open in Railway
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
