import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { filesApi, type FsKind } from "@/lib/filesApi";
import type { AiProvider } from "@/lib/types";

export interface CartEntry {
  path: string;
  name: string;
  kind: FsKind;
  projectRoot: string | null;
  projectLabel: string | null;
}

interface CartState {
  entries: CartEntry[];
  add: (entry: CartEntry) => void;
  remove: (path: string) => void;
  clear: () => void;
  has: (path: string) => boolean;
  toggle: (entry: CartEntry) => void;
}

const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      entries: [],
      add: (entry) =>
        set((state) =>
          state.entries.some((e) => e.path === entry.path)
            ? state
            : { entries: [...state.entries, entry] }
        ),
      remove: (path) => set((state) => ({ entries: state.entries.filter((e) => e.path !== path) })),
      clear: () => set({ entries: [] }),
      has: (path) => get().entries.some((e) => e.path === path),
      toggle: (entry) => {
        const exists = get().entries.some((e) => e.path === entry.path);
        if (exists) get().remove(entry.path);
        else get().add(entry);
      },
    }),
    { name: "workbench-context-cart" }
  )
);

export function useContextCart() {
  const entries = useCartStore((s) => s.entries);
  const add = useCartStore((s) => s.add);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const has = useCartStore((s) => s.has);
  const toggle = useCartStore((s) => s.toggle);

  async function copyAsContext() {
    if (entries.length === 0) {
      toast.error("Nothing in context yet", {
        description: "Add files with ⌘⏎ or the Add to Context button.",
      });
      return;
    }
    try {
      const context = await filesApi.buildContext(
        entries.map((e) => e.path),
        { respectGitignore: true, skipBinary: true, maxChars: 200_000 }
      );
      await navigator.clipboard.writeText(context);
      toast.success(`Copied ${context.length.toLocaleString()} characters to clipboard`);
    } catch (error) {
      toast.error("Failed to build context", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function launchAi(provider: AiProvider, rootOverride?: string) {
    const root = rootOverride ?? entries[0]?.projectRoot;
    if (!root) {
      toast.error("No project detected in context", {
        description: "Copy as context instead, or add a file from inside a scanned project.",
      });
      return;
    }
    try {
      const projects = await api.listProjects({
        shelf: "all",
        search: "",
        frameworks: [],
        tags: [],
        sort: "modified",
      });
      const project = projects.find((p) => p.path === root);
      if (!project) {
        toast.error("Project not in library yet", {
          description: "Scan this folder from Settings before launching an AI session.",
        });
        return;
      }
      const session = await api.startAiSession(project.id, provider);
      await navigator.clipboard.writeText(session.attachCommand);
      toast.success(`Session started — attach command copied`, {
        description: session.attachCommand,
      });
    } catch (error) {
      toast.error("Failed to launch AI session", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    entries,
    count: entries.length,
    add,
    remove,
    clear,
    has,
    toggle,
    copyAsContext,
    launchAi,
  };
}
