import { CopyIcon, FolderOpenIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/Markdown";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { useSkillDetail } from "@/hooks/useSkills";
import { formatLoc } from "@/lib/format";

interface SkillViewerProps {
  path: string | null;
}

export function SkillViewer({ path }: SkillViewerProps) {
  const { data, isLoading, isError, error, refetch } = useSkillDetail(path);

  if (!path) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a skill to read it.
      </div>
    );
  }

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={() => refetch()}
      skeleton={
        <div className="space-y-3 p-5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      {data && (
        <div className="h-full overflow-y-auto p-5">
          <div className="mb-4 space-y-2 rounded-lg border border-border bg-card p-4">
            <h2 className="text-lg font-semibold text-foreground">{data.entry.name}</h2>
            {data.entry.description && (
              <p className="text-sm text-muted-foreground">{data.entry.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">
                {data.entry.agent === "codex" ? "Codex" : "Claude Code"}
              </Badge>
              <Badge variant="outline">{data.entry.scope}</Badge>
              {data.entry.allowedTools.map((tool) => (
                <Badge key={tool} variant="secondary">
                  {tool}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.entry.fileCount} files · {formatLoc(data.entry.sizeBytes)} bytes
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground">
                {data.entry.path}
              </code>
              <Button
                size="sm"
                variant="ghost"
                className="cursor-pointer"
                onClick={() => {
                  navigator.clipboard.writeText(data.entry.path);
                  toast.success("Path copied");
                }}
              >
                <CopyIcon />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="cursor-pointer"
                onClick={() => toast.message(data.entry.path)}
              >
                <FolderOpenIcon />
              </Button>
            </div>
          </div>

          <Markdown>{data.markdown || "_This skill has no SKILL.md body._"}</Markdown>

          <details className="mt-6 rounded-lg border border-border bg-card p-3">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              {data.files.length} files in this skill
            </summary>
            <ul className="mt-2 space-y-0.5">
              {data.files.map((file) => (
                <li
                  key={file.path}
                  className="flex justify-between gap-3 font-mono text-[11px] text-muted-foreground"
                >
                  <span className="truncate">{file.path}</span>
                  <span className="shrink-0 tabular-nums">{file.sizeBytes}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </QueryState>
  );
}
