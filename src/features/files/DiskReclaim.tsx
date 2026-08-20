import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, HardDriveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/features/files/Checkbox";
import { useFilesStore } from "@/lib/filesStore";
import { useFsMutations } from "@/features/files/lib/useFsMutations";
import { TrashConfirmDialog } from "@/features/files/TrashConfirmDialog";
import { filesApi } from "@/lib/filesApi";
import { formatBytes } from "@/features/files/lib/format";

export function DiskReclaim() {
  const setMode = useFilesStore((s) => s.setMode);
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["disk-reclaim"],
    queryFn: filesApi.diskReclaimScan,
  });
  const { trashEntries } = useFsMutations();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const totalSize = useMemo(() => entries.reduce((sum, e) => sum + e.sizeBytes, 0), [entries]);
  const selectedSize = useMemo(
    () => entries.filter((e) => selected.has(e.path)).reduce((sum, e) => sum + e.sizeBytes, 0),
    [entries, selected]
  );

  function toggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <Button variant="ghost" size="icon-sm" onClick={() => setMode("browse")}>
          <ArrowLeftIcon />
        </Button>
        <span className="text-sm font-semibold">Disk Reclaim</span>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <HardDriveIcon className="size-3.5" />
          {entries.length} artifact folders · {formatBytes(totalSize)} total
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <div className="p-4 text-xs text-muted-foreground">Scanning…</div>}
        {!isLoading && entries.length === 0 && (
          <div className="p-4 text-xs text-muted-foreground">Nothing to reclaim.</div>
        )}
        {entries
          .slice()
          .sort((a, b) => b.sizeBytes - a.sizeBytes)
          .map((entry) => (
            <label
              key={entry.path}
              className="flex h-10 items-center gap-3 border-b border-border/50 px-4 text-sm hover:bg-secondary/40"
            >
              <Checkbox checked={selected.has(entry.path)} onChange={() => toggle(entry.path)} />
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{entry.path}</span>
              <span className="shrink-0 font-mono text-xs">{formatBytes(entry.sizeBytes)}</span>
            </label>
          ))}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-3">
        <span className="text-xs text-muted-foreground">
          {selected.size} selected · {formatBytes(selectedSize)}
        </span>
        <Button variant="destructive" disabled={selected.size === 0} onClick={() => setConfirming(true)}>
          Trash Selected
        </Button>
      </div>

      <TrashConfirmDialog
        paths={confirming ? Array.from(selected) : null}
        pending={trashEntries.isPending}
        onOpenChange={(open) => !open && setConfirming(false)}
        onConfirm={() => {
          trashEntries.mutate(Array.from(selected), {
            onSuccess: () => {
              setConfirming(false);
              setSelected(new Set());
            },
          });
        }}
      />
    </div>
  );
}
