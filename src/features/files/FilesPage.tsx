import { useEffect } from "react";
import { FolderOpenIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFilesStore } from "@/lib/filesStore";
import { useFsWatch } from "@/hooks/useFsWatch";
import { useScanRoots } from "@/hooks/useScanRoots";
import { api } from "@/lib/api";
import { BreadcrumbBar } from "@/features/files/BreadcrumbBar";
import { FilesToolbar } from "@/features/files/FilesToolbar";
import { ColumnBrowser } from "@/features/files/ColumnBrowser";
import { ListBrowser } from "@/features/files/ListBrowser";
import { PreviewPane } from "@/features/files/PreviewPane";
import { StarterLibrary } from "@/features/files/StarterLibrary";
import { DiskReclaim } from "@/features/files/DiskReclaim";
import { useFilesCommandItems } from "@/features/files/FilesCommandItems";

export function FilesPage() {
  const rootPath = useFilesStore((s) => s.rootPath);
  const setRoot = useFilesStore((s) => s.setRoot);
  const view = useFilesStore((s) => s.view);
  const mode = useFilesStore((s) => s.mode);
  const { roots, isLoading } = useScanRoots();

  useFsWatch();
  useFilesCommandItems();

  useEffect(() => {
    if (rootPath || isLoading || roots.length === 0) return;
    setRoot(roots[0].path);
  }, [rootPath, isLoading, roots, setRoot]);

  if (mode === "starters") return <StarterLibrary />;
  if (mode === "reclaim") return <DiskReclaim />;

  if (!rootPath && isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">Looking for your folders…</p>
      </div>
    );
  }

  if (!rootPath) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <FolderOpenIcon className="size-8 text-muted-foreground" strokeWidth={1.25} />
        <p className="text-sm text-muted-foreground">No folder open yet.</p>
        <Button
          onClick={async () => {
            const path = await api.pickFolder();
            if (path) setRoot(path);
          }}
        >
          Choose a folder
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <BreadcrumbBar />
      <FilesToolbar />
      <div className="flex min-h-0 flex-1">
        {view === "columns" ? <ColumnBrowser /> : <ListBrowser />}
        <PreviewPane />
      </div>
    </div>
  );
}
