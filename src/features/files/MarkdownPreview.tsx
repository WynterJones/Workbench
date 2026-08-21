import { useTextFile } from "@/features/files/lib/useTextFile";
import { Markdown } from "@/components/Markdown";
import { parentPath } from "@/features/files/lib/paths";

interface MarkdownPreviewProps {
  path: string;
  size: number | null;
  variant?: "default" | "dossier";
}

export function MarkdownPreview({ path, size, variant = "default" }: MarkdownPreviewProps) {
  const { data: content, isLoading } = useTextFile(path, size);

  if (isLoading) return <div className="p-4 text-xs text-muted-foreground">Loading…</div>;
  if (!content) return <div className="p-4 text-xs text-muted-foreground">Can't preview this file.</div>;

  return (
    <div className="h-full overflow-y-auto p-4">
      <Markdown basePath={parentPath(path)} variant={variant}>{content}</Markdown>
    </div>
  );
}
