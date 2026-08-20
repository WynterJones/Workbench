import { useTextFile } from "@/features/files/lib/useTextFile";
import { renderMarkdownLite } from "@/features/files/lib/markdown";

interface MarkdownPreviewProps {
  path: string;
  size: number | null;
}

export function MarkdownPreview({ path, size }: MarkdownPreviewProps) {
  const { data: content, isLoading } = useTextFile(path, size);

  if (isLoading) return <div className="p-4 text-xs text-muted-foreground">Loading…</div>;
  if (!content) return <div className="p-4 text-xs text-muted-foreground">Can't preview this file.</div>;

  return <div className="h-full space-y-1 overflow-y-auto p-4">{renderMarkdownLite(content)}</div>;
}
