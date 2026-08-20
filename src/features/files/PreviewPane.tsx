import { PanelRightCloseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFilesStore } from "@/lib/filesStore";
import { useEntryInfo } from "@/hooks/useDirectory";
import { CodePreview } from "@/features/files/CodePreview";
import { FolderPreview } from "@/features/files/FolderPreview";
import { ImagePreview } from "@/features/files/ImagePreview";
import { MarkdownPreview } from "@/features/files/MarkdownPreview";
import { previewKindForFile } from "@/features/files/lib/previewKind";
import { MediaPreview } from "@/features/files/MediaPreview";
import { BinaryPreview } from "@/features/files/BinaryPreview";
import { baseName, currentDirectory } from "@/features/files/lib/paths";

export function PreviewPane() {
  const previewOpen = useFilesStore((s) => s.previewOpen);
  const setPreviewOpen = useFilesStore((s) => s.setPreviewOpen);
  const rootPath = useFilesStore((s) => s.rootPath);
  const selectedPath = useFilesStore((s) => s.selectedPath);
  const selectedKind = useFilesStore((s) => s.selectedKind);

  const isFolder = selectedKind !== "file";
  const activePath = isFolder ? currentDirectory(rootPath, selectedPath, selectedKind) : (selectedPath as string);
  const extension = isFolder ? null : (activePath.split(".").pop() ?? null);
  const { data: fileInfo } = useEntryInfo(isFolder ? null : activePath);
  const fileName = baseName(activePath);
  const kind = previewKindForFile(fileName);

  if (!previewOpen) return null;

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-card/40">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-2">
        <span className="truncate px-1 font-mono text-[11px] text-muted-foreground">{baseName(activePath)}</span>
        <Button variant="ghost" size="icon-sm" onClick={() => setPreviewOpen(false)}>
          <PanelRightCloseIcon className="size-3.5" />
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        {isFolder && <FolderPreview path={activePath} />}
        {!isFolder && kind === "image" && <ImagePreview path={activePath} />}
        {!isFolder && kind === "markdown" && <MarkdownPreview path={activePath} size={fileInfo?.size ?? null} />}
        {!isFolder && kind === "binary" && (
          <BinaryPreview
            name={fileName}
            size={fileInfo?.size ?? null}
            modified={fileInfo?.modified ?? null}
          />
        )}
        {!isFolder && (kind === "video" || kind === "audio" || kind === "pdf") && (
          <MediaPreview path={activePath} kind={kind} />
        )}
        {!isFolder && kind === "code" && (
          <CodePreview path={activePath} extension={extension} size={fileInfo?.size ?? null} />
        )}
      </div>
    </div>
  );
}
