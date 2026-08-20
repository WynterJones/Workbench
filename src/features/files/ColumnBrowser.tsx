import { useEffect, useMemo, useRef, useState } from "react";
import { useFilesStore } from "@/lib/filesStore";
import { useFsMutations } from "@/features/files/lib/useFsMutations";
import { useColumnKeyboard } from "@/features/files/lib/useColumnKeyboard";
import { buildPanes } from "@/features/files/lib/paths";
import { ColumnPane } from "@/features/files/ColumnPane";
import { TrashConfirmDialog } from "@/features/files/TrashConfirmDialog";

export function ColumnBrowser() {
  const rootPath = useFilesStore((s) => s.rootPath);
  const selectedPath = useFilesStore((s) => s.selectedPath);
  const selectedKind = useFilesStore((s) => s.selectedKind);
  const select = useFilesStore((s) => s.select);
  const focusedPane = useFilesStore((s) => s.focusedPane);
  const setFocusedPane = useFilesStore((s) => s.setFocusedPane);

  const panes = useMemo(() => buildPanes(rootPath, selectedPath, selectedKind), [rootPath, selectedPath, selectedKind]);
  const clampedFocus = Math.min(focusedPane, panes.length - 1);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const { trashEntries } = useFsMutations();
  const [pendingTrash, setPendingTrash] = useState<string[] | null>(null);
  const { onKeyDown } = useColumnKeyboard({ panes, clampedFocus, onRequestTrash: setPendingTrash });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  }, [panes.length]);

  return (
    <div
      ref={scrollerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="flex h-full min-w-0 flex-1 overflow-x-auto outline-none"
    >
      {panes.map((pane, index) => (
        <ColumnPane
          key={pane.dir}
          dir={pane.dir}
          paneIndex={index}
          highlightName={pane.highlight}
          focused={index === clampedFocus}
          onFocusPane={() => setFocusedPane(index)}
          onSelectEntry={(entry) => select(entry.path, entry.kind)}
          onRequestTrash={(paths) => setPendingTrash(paths)}
        />
      ))}
      <TrashConfirmDialog
        paths={pendingTrash}
        pending={trashEntries.isPending}
        onOpenChange={(open) => !open && setPendingTrash(null)}
        onConfirm={() => {
          if (!pendingTrash) return;
          trashEntries.mutate(pendingTrash, { onSuccess: () => setPendingTrash(null) });
        }}
      />
    </div>
  );
}
