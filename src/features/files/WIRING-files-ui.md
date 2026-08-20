# Wiring the Files workspace into the shell

I own `src/features/files/**`, the four `src/hooks/*` files listed below, and
`src/lib/filesApi.ts` / `src/lib/filesStore.ts`. I do not own `App.tsx`,
`store.ts`, or `Sidebar.tsx` — an integrator needs to add the lines below.

## 1. `src/lib/store.ts`

Add `"files"` to the `Route` union and a `filesPath` field used to jump the
Files view to a specific folder from elsewhere in the app (e.g. a project's
"Browse Files" action):

```ts
export type Route = "intro" | "library" | "project" | "settings" | "files";
```

```ts
interface AppState {
  // ...existing fields
  filesPath: string | null;
  openFiles: (path?: string) => void;
}
```

```ts
export const useAppStore = create<AppState>((set) => ({
  // ...existing fields
  filesPath: null,
  openFiles: (path) => set({ filesPath: path ?? null, route: "files" }),
}));
```

## 2. `src/App.tsx`

Render `FilesPage` when the route is `"files"`, and forward `filesPath` into
my internal store on mount so a caller-specified path takes effect:

```tsx
import { FilesPage } from "@/features/files/FilesPage";
import { useFilesStore } from "@/lib/filesStore";

// inside the component that switches on `route`, alongside the other cases:
{route === "files" && <FilesPage />}
```

If you want `filesPath` to actually seed the browser (rather than falling
back to the first scan root), add this once near the top of `App.tsx`:

```tsx
const filesPath = useAppStore((s) => s.filesPath);
useEffect(() => {
  if (filesPath) useFilesStore.getState().setRoot(filesPath);
}, [filesPath]);
```

## 3. `src/components/Sidebar.tsx`

Add a nav entry next to Settings (or inside `ShelfNav` if you'd rather it
live there):

```tsx
import { FolderIcon } from "lucide-react";

<button
  type="button"
  onClick={() => useAppStore.getState().openFiles()}
  className={cn(
    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150 ease-out",
    route === "files"
      ? "bg-secondary text-foreground"
      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
  )}
>
  <FolderIcon className="size-4 shrink-0" strokeWidth={1.75} />
  <span>Files</span>
</button>
```

## 4. Optional — project detail "Browse Files"

Anywhere with a `Project`, jump straight to its folder:

```ts
useAppStore.getState().openFiles(project.path);
```

---

## What I stubbed / needs backend follow-up

- `filesApi.ts` defines a `disk_reclaim_scan` Tauri command that isn't in the
  original backend contract. `DiskReclaim.tsx` needs a command that walks
  scan roots and returns `{ path, kind, sizeBytes, projectPath }[]` for
  `node_modules`/`dist`/`target`/etc. Without it the panel just shows "Nothing
  to reclaim."
- `ContextCart`'s "Launch AI" resolves a project by matching `FsEntry.path`
  (via `resolveProjectRoot`, which walks `get_info` up the tree looking for
  `isProject: true`) against `list_projects`, then reuses the existing
  `api.startAiSession(projectId, provider)`. If the folder in the cart isn't
  already scanned into the Workbench DB, it shows a toast asking the user to
  scan it first — there's no path-rooted AI-launch command in the contract.
- Everything else (`list_dir`, `create_*`, `rename_entry`, `move_entries`,
  `copy_entries`, `trash_entries`, `get_info`, starters, `file_templates`,
  `build_context`, `fs:changed`, `scaffold:progress`) is called exactly per
  the contract in `src/lib/filesApi.ts` and will light up once the Rust side
  lands.
