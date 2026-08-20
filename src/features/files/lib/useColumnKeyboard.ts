import { useEffect, useState, type KeyboardEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFilesStore } from "@/lib/filesStore";
import { useAddToCart } from "@/features/files/lib/useAddToCart";
import { partitionEntries } from "@/features/files/lib/noise";
import { joinPath, parentPath, type PaneSpec } from "@/features/files/lib/paths";
import type { FsEntry } from "@/lib/filesApi";

interface UseColumnKeyboardArgs {
  panes: PaneSpec[];
  clampedFocus: number;
  onRequestTrash: (paths: string[]) => void;
}

export function useColumnKeyboard({ panes, clampedFocus, onRequestTrash }: UseColumnKeyboardArgs) {
  const rootPath = useFilesStore((s) => s.rootPath);
  const selectedPath = useFilesStore((s) => s.selectedPath);
  const renamingPath = useFilesStore((s) => s.renamingPath);
  const showHidden = useFilesStore((s) => s.showHidden);
  const sortBy = useFilesStore((s) => s.sortBy);
  const sortDesc = useFilesStore((s) => s.sortDesc);
  const select = useFilesStore((s) => s.select);
  const setRoot = useFilesStore((s) => s.setRoot);
  const setFocusedPane = useFilesStore((s) => s.setFocusedPane);
  const setRenamingPath = useFilesStore((s) => s.setRenamingPath);
  const togglePreview = useFilesStore((s) => s.togglePreview);
  const queryClient = useQueryClient();
  const { toggleEntry } = useAddToCart();
  const [typeAhead, setTypeAhead] = useState("");

  useEffect(() => {
    if (!typeAhead) return;
    const timer = setTimeout(() => setTypeAhead(""), 700);
    return () => clearTimeout(timer);
  }, [typeAhead]);

  function focusedPaneEntries(): FsEntry[] {
    const pane = panes[clampedFocus];
    if (!pane) return [];
    const cached = queryClient.getQueryData<FsEntry[]>(["dir", pane.dir, showHidden, sortBy, sortDesc]);
    return cached ? partitionEntries(cached).visible : [];
  }

  function moveHighlight(delta: number, matchPrefix?: string) {
    const pane = panes[clampedFocus];
    if (!pane) return;
    const entries = focusedPaneEntries();
    if (entries.length === 0) return;
    const currentIndex = pane.highlight ? entries.findIndex((e) => e.name === pane.highlight) : -1;
    let nextIndex: number;
    if (matchPrefix) {
      nextIndex = entries.findIndex((e) => e.name.toLowerCase().startsWith(matchPrefix));
      if (nextIndex === -1) return;
    } else {
      if (currentIndex === -1 && delta < 0) return;
      nextIndex = currentIndex === -1 && delta > 0 ? 0 : Math.min(Math.max(currentIndex + delta, 0), entries.length - 1);
    }
    const entry = entries[nextIndex];
    select(joinPath(pane.dir, entry.name), entry.kind);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (renamingPath) return;
    const meta = event.metaKey || event.ctrlKey;
    const pane = panes[clampedFocus];

    if (meta && event.key === "ArrowUp") {
      event.preventDefault();
      if (selectedPath) {
        select(parentPath(selectedPath), "dir");
        setFocusedPane(Math.max(clampedFocus - 1, 0));
      } else {
        setRoot(parentPath(rootPath));
      }
      return;
    }
    if (meta && event.key === "Enter") {
      event.preventDefault();
      const entry = pane?.highlight ? focusedPaneEntries().find((e) => e.name === pane.highlight) : null;
      if (entry) toggleEntry(entry);
      return;
    }
    if (meta && event.key === "Backspace") {
      event.preventDefault();
      if (pane?.highlight) onRequestTrash([joinPath(pane.dir, pane.highlight)]);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setFocusedPane(Math.min(clampedFocus + 1, panes.length - 1));
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setFocusedPane(Math.max(clampedFocus - 1, 0));
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (pane?.highlight) setRenamingPath(joinPath(pane.dir, pane.highlight));
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      togglePreview();
      return;
    }
    if (event.key.length === 1 && !meta && !event.altKey) {
      const next = typeAhead + event.key.toLowerCase();
      setTypeAhead(next);
      moveHighlight(0, next);
    }
  }

  return { onKeyDown };
}
