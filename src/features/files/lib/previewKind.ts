const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "avif"]);
const MARKDOWN_EXTS = new Set(["md", "mdx", "markdown"]);
const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "m4v"]);
const AUDIO_EXTS = new Set(["mp3", "wav", "m4a", "aac", "ogg", "flac"]);
const PDF_EXTS = new Set(["pdf"]);
const BINARY_EXTS = new Set([
  "zip",
  "tar",
  "gz",
  "bz2",
  "7z",
  "rar",
  "dmg",
  "sqlite",
  "db",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  "exe",
  "dll",
  "so",
  "dylib",
  "wasm",
  "class",
  "jar",
  "pyc",
  "o",
  "a",
  "bin",
]);

const KNOWN_TEXT_FILES = new Set([
  "dockerfile",
  "makefile",
  "gemfile",
  "rakefile",
  "procfile",
  "brewfile",
  "license",
  "licence",
  "readme",
  "changelog",
  "authors",
  "notice",
  "codeowners",
  "gitignore",
  "gitattributes",
  "npmrc",
  "nvmrc",
  "editorconfig",
  "env",
]);

export type PreviewKind = "image" | "markdown" | "video" | "audio" | "pdf" | "code" | "binary";

export function previewKindForExtension(extension: string | null): PreviewKind {
  const ext = (extension ?? "").toLowerCase();
  if (IMAGE_EXTS.has(ext)) return "image";
  if (MARKDOWN_EXTS.has(ext)) return "markdown";
  if (VIDEO_EXTS.has(ext)) return "video";
  if (AUDIO_EXTS.has(ext)) return "audio";
  if (PDF_EXTS.has(ext)) return "pdf";
  if (BINARY_EXTS.has(ext)) return "binary";
  return "code";
}

export function previewKindForFile(fileName: string): PreviewKind {
  const name = fileName.toLowerCase();
  const dotIndex = name.lastIndexOf(".");

  if (dotIndex <= 0) {
    const bare = name.replace(/^\./, "");
    return KNOWN_TEXT_FILES.has(bare) ? "code" : previewKindForExtension(null);
  }

  const base = name.slice(0, dotIndex).replace(/^\./, "");
  if (KNOWN_TEXT_FILES.has(base) || KNOWN_TEXT_FILES.has(name.replace(/^\./, ""))) {
    return "code";
  }

  return previewKindForExtension(name.slice(dotIndex + 1));
}
