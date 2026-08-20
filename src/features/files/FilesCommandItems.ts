import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore, type CommandPaletteItem } from "@/lib/store";
import { useFilesStore } from "@/lib/filesStore";
import { useContextCart } from "@/hooks/useContextCart";
import { currentDirectory } from "@/features/files/lib/paths";
import { resolveProjectRoot } from "@/features/files/lib/projectLookup";

const PREFIX = "files:";

function goToFiles() {
  (useAppStore.getState().setRoute as (route: string) => void)("files");
}

export function useFilesCommandItems() {
  const queryClient = useQueryClient();
  const cart = useContextCart();
  const setMode = useFilesStore((s) => s.setMode);
  const setRoot = useFilesStore((s) => s.setRoot);
  const rootPath = useFilesStore((s) => s.rootPath);
  const selectedPath = useFilesStore((s) => s.selectedPath);
  const selectedKind = useFilesStore((s) => s.selectedKind);
  const requestNewFile = useFilesStore((s) => s.requestNewFile);

  useEffect(() => {
    const items: CommandPaletteItem[] = [
      {
        id: `${PREFIX}jump`,
        label: "Jump to folder…",
        group: "Files",
        onSelect: async () => {
          const path = await api.pickFolder();
          if (!path) return;
          goToFiles();
          setMode("browse");
          setRoot(path);
        },
      },
      {
        id: `${PREFIX}starters`,
        label: "New project from starter",
        group: "Files",
        onSelect: () => {
          goToFiles();
          setMode("starters");
        },
      },
      {
        id: `${PREFIX}copy-cart`,
        label: "Copy cart as prompt context",
        hint: `${cart.count} item${cart.count === 1 ? "" : "s"}`,
        group: "Files",
        onSelect: () => cart.copyAsContext(),
      },
      {
        id: `${PREFIX}launch-ai`,
        label: "Launch AI here",
        group: "Files",
        onSelect: async () => {
          const dir = currentDirectory(rootPath, selectedPath, selectedKind);
          if (!dir) return;
          const project = await resolveProjectRoot(queryClient, dir);
          if (!project) {
            toast.error("Not in your library yet", { description: "Scan this folder from Settings first." });
            return;
          }
          cart.launchAi("claude-code", project.root);
        },
      },
      {
        id: `${PREFIX}new-file`,
        label: "New file here",
        group: "Files",
        onSelect: () => {
          goToFiles();
          setMode("browse");
          requestNewFile();
        },
      },
    ];

    const others = useAppStore.getState().commandItems.filter((item) => !item.id.startsWith(PREFIX));
    useAppStore.getState().setCommandItems([...others, ...items]);

    return () => {
      const remaining = useAppStore.getState().commandItems.filter((item) => !item.id.startsWith(PREFIX));
      useAppStore.getState().setCommandItems(remaining);
    };
  }, [cart.count, queryClient, requestNewFile, rootPath, selectedPath, selectedKind, setMode, setRoot]);
}
