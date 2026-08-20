export function joinPath(base: string, segment: string): string {
  if (!base) return segment;
  return base.endsWith("/") ? `${base}${segment}` : `${base}/${segment}`;
}

export function parentPath(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  return idx <= 0 ? "/" : trimmed.slice(0, idx);
}

export function baseName(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

export function relativeSegments(root: string, target: string): string[] {
  if (!target.startsWith(root)) return [];
  const rel = target.slice(root.length).replace(/^\/+/, "");
  return rel.length ? rel.split("/") : [];
}

export function breadcrumbSegments(path: string): { name: string; path: string }[] {
  const parts = path.split("/").filter(Boolean);
  const segments: { name: string; path: string }[] = [{ name: "/", path: "/" }];
  let cur = "";
  for (const part of parts) {
    cur = `${cur}/${part}`;
    segments.push({ name: part, path: cur });
  }
  return segments;
}

export interface PaneSpec {
  dir: string;
  highlight: string | null;
}

export function buildPanes(rootPath: string, selectedPath: string | null, selectedKind: string | null): PaneSpec[] {
  const segments = relativeSegments(rootPath, selectedPath ?? rootPath);
  const dirsChain = [rootPath];
  let cur = rootPath;
  for (const seg of segments) {
    cur = joinPath(cur, seg);
    dirsChain.push(cur);
  }
  const panes: PaneSpec[] = [];
  for (let i = 0; i < segments.length; i++) {
    panes.push({ dir: dirsChain[i], highlight: segments[i] });
  }
  if (selectedKind === "dir" || selectedPath === null) {
    panes.push({ dir: dirsChain[dirsChain.length - 1], highlight: null });
  }
  return panes;
}

export function currentDirectory(rootPath: string, selectedPath: string | null, selectedKind: string | null): string {
  if (!selectedPath) return rootPath;
  return selectedKind === "dir" ? selectedPath : parentPath(selectedPath);
}

export function isValidProjectName(name: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(name);
}
