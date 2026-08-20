import { CheckIcon, CopyIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { openUrl } from "@/lib/openUrl";
import { cn } from "@/lib/utils";
import type { SystemCheck } from "@/hooks/useSystemChecks";

interface SystemCheckRowProps {
  check: SystemCheck;
}

export function SystemCheckRow({ check }: SystemCheckRowProps) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
          check.ok ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn",
        )}
      >
        {check.ok ? (
          <CheckIcon className="size-3" strokeWidth={3} />
        ) : (
          <TriangleAlertIcon className="size-3" strokeWidth={2.5} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{check.label}</p>
        <p className="text-xs text-muted-foreground">{check.enables}</p>

        {!check.ok && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <code className="min-w-0 flex-1 truncate rounded bg-secondary px-1.5 py-1 font-mono text-[10px] text-muted-foreground">
              {check.fixCommand}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(check.fixCommand);
                toast.success("Command copied");
              }}
              className="shrink-0 cursor-pointer rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label={`Copy install command for ${check.label}`}
            >
              <CopyIcon className="size-3" />
            </button>
            <button
              type="button"
              onClick={() => openUrl(check.fixUrl)}
              className="shrink-0 cursor-pointer rounded px-1.5 py-1 text-[10px] text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Get it
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
