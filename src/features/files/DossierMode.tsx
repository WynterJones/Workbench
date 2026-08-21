import { useEffect, useState } from "react";
import { CrosshairIcon, FileStackIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DossierCard } from "@/features/files/DossierCard";
import { DossierViewer } from "@/features/files/DossierViewer";
import { currentDirectory } from "@/features/files/lib/paths";
import { useDocuments } from "@/hooks/useDirectory";
import { useFilesStore } from "@/lib/filesStore";

function readOrder(dir: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(`workbench-007:${dir}`) ?? "[]");
    return Array.isArray(value) ? value.filter((path): path is string => typeof path === "string") : [];
  } catch {
    return [];
  }
}

function saveOrder(dir: string, paths: string[]) {
  try {
    localStorage.setItem(`workbench-007:${dir}`, JSON.stringify(paths));
  } catch {
    return;
  }
}

export function DossierMode() {
  const rootPath = useFilesStore((state) => state.rootPath);
  const selectedPath = useFilesStore((state) => state.selectedPath);
  const selectedKind = useFilesStore((state) => state.selectedKind);
  const dir = currentDirectory(rootPath, selectedPath, selectedKind);
  const [open, setOpen] = useState(false);
  const { data: docs = [], isLoading } = useDocuments(dir, open);
  const [order, setOrder] = useState<string[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [draggedPath, setDraggedPath] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  useEffect(() => {
    const available = new Set(docs.map((entry) => entry.path));
    const saved = readOrder(dir).filter((path) => available.has(path));
    const next = [...saved, ...docs.map((entry) => entry.path).filter((path) => !saved.includes(path))];
    setOrder(next);
    setActivePath((current) => (current && available.has(current) ? current : next[0] ?? null));
  }, [dir, docs]);

  const orderedDocs = (order.length ? order : docs.map((entry) => entry.path))
    .map((path) => docs.find((entry) => entry.path === path))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const active = docs.find((entry) => entry.path === activePath) ?? null;

  function updateOrder(next: string[]) {
    setOrder(next);
    saveOrder(dir, next);
  }

  function moveTo(path: string | null, target: string) {
    if (!path || path === target) return;
    const next = order.filter((item) => item !== path);
    const targetIndex = next.indexOf(target);
    if (targetIndex === -1) return;
    next.splice(targetIndex, 0, path);
    updateOrder(next);
    setDraggedPath(null);
    setDropTarget(null);
  }

  function moveBy(path: string, offset: number) {
    const index = order.indexOf(path);
    const nextIndex = Math.max(0, Math.min(order.length - 1, index + offset));
    if (index < 0 || index === nextIndex) return;
    const next = [...order];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    updateOrder(next);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="cursor-pointer text-brand hover:text-brand">
          <CrosshairIcon />
          007 Mode
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="inset-3 top-3 left-3 flex h-auto w-auto max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-xl border-brand/30 bg-[#080807] p-0 shadow-2xl sm:max-w-none"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-56 size-[34rem] rounded-full border-[5rem] border-brand/5" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-24 size-72 rounded-full border border-brand/15" />
        <header className="relative flex h-16 shrink-0 items-center gap-4 border-b border-brand/25 bg-card/50 px-5">
          <div className="flex size-9 items-center justify-center rounded-full border border-brand/40 bg-brand/10 font-mono text-xs font-bold text-brand">
            007
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-base font-semibold tracking-wide">Dossier display</DialogTitle>
            <DialogDescription className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {dir} · {docs.length} document{docs.length === 1 ? "" : "s"}
            </DialogDescription>
          </div>
          <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:block">
            Drag to arrange · Shift + arrows also works
          </span>
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close 007 Mode">
              <XIcon />
            </Button>
          </DialogClose>
        </header>

        <div className="relative grid min-h-0 flex-1 grid-cols-[minmax(18rem,36%)_minmax(0,1fr)] max-md:grid-cols-1">
          <aside className="min-h-0 overflow-y-auto border-r border-brand/20 bg-background/60 p-4 max-md:border-r-0 max-md:border-b">
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading dossiers…</p>
            ) : docs.length === 0 ? (
              <div className="flex h-full min-h-52 items-center justify-center text-center">
                <div>
                  <FileStackIcon className="mx-auto mb-3 size-8 text-brand/60" strokeWidth={1.25} />
                  <p className="text-sm font-medium">No dossiers in this folder</p>
                  <p className="mt-1 text-xs text-muted-foreground">Add Markdown or PDF files, then reopen this display.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
                {orderedDocs.map((entry, index) => (
                  <DossierCard
                    key={entry.path}
                    entry={entry}
                    rootPath={dir}
                    index={index}
                    selected={entry.path === activePath}
                    dragging={entry.path === draggedPath}
                    dropTarget={entry.path === dropTarget}
                    onSelect={() => setActivePath(entry.path)}
                    onMove={(offset) => moveBy(entry.path, offset)}
                    onDragStart={() => setDraggedPath(entry.path)}
                    onDragEnd={() => {
                      setDraggedPath(null);
                      setDropTarget(null);
                    }}
                    onDragOver={() => setDropTarget(entry.path)}
                    onDrop={() => moveTo(draggedPath, entry.path)}
                  />
                ))}
              </div>
            )}
          </aside>
          <main className="min-h-0 min-w-0">
            <DossierViewer entry={active} />
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
