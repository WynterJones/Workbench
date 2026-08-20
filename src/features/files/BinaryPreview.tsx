import { FileIcon } from "lucide-react";
import { formatBytes } from "@/features/files/lib/format";

interface BinaryPreviewProps {
  name: string;
  size: number | null;
  modified: string | null;
  reason?: string;
}

export function BinaryPreview({ name, size, modified, reason }: BinaryPreviewProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg border border-border bg-card">
        <FileIcon className="size-5 text-muted-foreground" strokeWidth={1.5} />
      </span>
      <div className="space-y-1">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {size !== null ? formatBytes(size) : "unknown size"}
          {modified ? ` · ${new Date(modified).toLocaleDateString()}` : ""}
        </p>
      </div>
      <p className="max-w-[220px] text-xs text-muted-foreground">
        {reason ?? "This is a binary file, so there is nothing to show."}
      </p>
    </div>
  );
}
