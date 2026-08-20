const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"]);
const MARKDOWN_EXTS = new Set(["md", "mdx"]);
const BINARY_EXTS = new Set([
  "zip",
  "tar",
  "gz",
  "sqlite",
  "db",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "mp4",
  "mov",
  "mp3",
  "wav",
  "pdf",
  "ico",
]);

export type PreviewKind = "image" | "markdown" | "code" | "binary";

export function previewKindForExtension(extension: string | null): PreviewKind {
  const ext = (extension ?? "").toLowerCase();
  if (IMAGE_EXTS.has(ext)) return "image";
  if (MARKDOWN_EXTS.has(ext)) return "markdown";
  if (BINARY_EXTS.has(ext)) return "binary";
  return "code";
}
