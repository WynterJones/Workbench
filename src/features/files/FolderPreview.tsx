import { FolderIcon, GitBranchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEntryInfo } from "@/hooks/useDirectory";
import { formatBytes, formatModified } from "@/features/files/lib/format";
import { baseName } from "@/features/files/lib/paths";

interface FolderPreviewProps {
  path: string;
}

export function FolderPreview({ path }: FolderPreviewProps) {
  const { data: info, isLoading } = useEntryInfo(path);

  if (isLoading || !info) {
    return <div className="p-4 text-xs text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <div className="flex items-center gap-2">
        <FolderIcon className="size-5 text-muted-foreground" strokeWidth={1.5} />
        <span className="truncate text-sm font-medium">{baseName(path)}</span>
      </div>

      {(info.framework || info.gitBranch) && (
        <div className="flex flex-wrap gap-1.5">
          {info.framework && <Badge variant="outline">{info.framework}</Badge>}
          {info.gitBranch && (
            <Badge variant="outline" className="gap-1">
              <GitBranchIcon className="size-3" />
              {info.gitBranch}
              {info.gitDirty ? " *" : ""}
            </Badge>
          )}
        </div>
      )}

      <dl className="grid grid-cols-2 gap-y-1.5 border-t border-border/70 pt-3 font-mono text-[11px] text-muted-foreground">
        <dt>Items</dt>
        <dd className="text-right text-foreground">{info.entryCount ?? "—"}</dd>
        <dt>Size</dt>
        <dd className="text-right text-foreground">{formatBytes(info.size)}</dd>
        <dt>Modified</dt>
        <dd className="text-right text-foreground">{formatModified(info.modified)}</dd>
      </dl>

      {info.readmeExcerpt && (
        <div className="border-t border-border pt-3">
          <div className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">README</div>
          <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/80">{info.readmeExcerpt}</p>
        </div>
      )}
    </div>
  );
}
