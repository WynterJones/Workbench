import { convertFileSrc } from "@tauri-apps/api/core";

const REMOTE = /^(https?:|data:|blob:)/i;

export function resolveAsset(src: string | undefined, basePath: string | null): string | undefined {
  if (!src) return undefined;
  if (REMOTE.test(src)) return src;
  if (!basePath) return src;

  const cleaned = src.replace(/^\.\//, "").replace(/^\//, "").split(/[?#]/)[0];
  const root = basePath.replace(/\/+$/, "");
  return convertFileSrc(`${root}/${cleaned}`);
}
