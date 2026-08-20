import { convertFileSrc } from "@tauri-apps/api/core";

interface MediaPreviewProps {
  path: string;
  kind: "video" | "audio" | "pdf";
}

export function MediaPreview({ path, kind }: MediaPreviewProps) {
  const src = convertFileSrc(path);

  if (kind === "audio") {
    return (
      <div className="p-4">
        <audio controls src={src} className="w-full" />
      </div>
    );
  }

  if (kind === "pdf") {
    return <iframe title="PDF preview" src={src} className="size-full border-0" />;
  }

  return (
    <div className="p-3">
      <video controls src={src} className="w-full rounded-md" />
    </div>
  );
}
