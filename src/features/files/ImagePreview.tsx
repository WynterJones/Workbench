import { convertFileSrc } from "@tauri-apps/api/core";
import { baseName } from "@/features/files/lib/paths";

interface ImagePreviewProps {
  path: string;
}

export function ImagePreview({ path }: ImagePreviewProps) {
  return (
    <div className="flex h-full items-center justify-center overflow-auto bg-black/20 p-4">
      <img src={convertFileSrc(path)} alt={baseName(path)} className="max-h-full max-w-full object-contain" />
    </div>
  );
}
