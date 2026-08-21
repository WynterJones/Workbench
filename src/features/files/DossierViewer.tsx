import { EyeIcon } from "lucide-react";
import { MarkdownPreview } from "@/features/files/MarkdownPreview";
import { MediaPreview } from "@/features/files/MediaPreview";
import type { FsEntry } from "@/lib/filesApi";

interface DossierViewerProps {
  entry: FsEntry | null;
}

export function DossierViewer({ entry }: DossierViewerProps) {
  if (!entry) {
    return (
      <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
        <div>
          <EyeIcon className="mx-auto mb-3 size-7 text-brand/70" strokeWidth={1.25} />
          Select a dossier to inspect it.
        </div>
      </div>
    );
  }

  const pdf = entry.extension?.toLowerCase() === "pdf";

  return (
    <section aria-label={`Viewing ${entry.name}`} className="flex h-full min-w-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-brand/20 px-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-brand">Eyes only</span>
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{entry.name}</h3>
        <span className="font-mono text-[10px] uppercase text-muted-foreground">{pdf ? "PDF" : "Markdown"}</span>
      </header>
      <div className="min-h-0 flex-1 bg-background/80">
        {pdf ? (
          <MediaPreview path={entry.path} kind="pdf" />
        ) : (
          <MarkdownPreview path={entry.path} size={entry.size} variant="dossier" />
        )}
      </div>
    </section>
  );
}
