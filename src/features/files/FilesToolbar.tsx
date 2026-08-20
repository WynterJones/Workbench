import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ColumnsIcon,
  EyeIcon,
  EyeOffIcon,
  HardDriveIcon,
  LayoutListIcon,
  RocketIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFilesStore } from "@/lib/filesStore";
import { NewFileMenu } from "@/features/files/NewFileMenu";
import { currentDirectory } from "@/features/files/lib/paths";
import type { FsSortBy } from "@/lib/filesApi";
import { cn } from "@/lib/utils";

const SORT_LABELS: Record<FsSortBy, string> = {
  name: "Name",
  size: "Size",
  modified: "Modified",
  kind: "Kind",
};


export function FilesToolbar() {
  const view = useFilesStore((s) => s.view);
  const setView = useFilesStore((s) => s.setView);
  const showHidden = useFilesStore((s) => s.showHidden);
  const toggleShowHidden = useFilesStore((s) => s.toggleShowHidden);
  const sortBy = useFilesStore((s) => s.sortBy);
  const sortDesc = useFilesStore((s) => s.sortDesc);
  const setSort = useFilesStore((s) => s.setSort);
  const navigateBack = useFilesStore((s) => s.navigateBack);
  const navigateForward = useFilesStore((s) => s.navigateForward);
  const setMode = useFilesStore((s) => s.setMode);
  const rootPath = useFilesStore((s) => s.rootPath);
  const selectedPath = useFilesStore((s) => s.selectedPath);
  const selectedKind = useFilesStore((s) => s.selectedKind);

  const dir = currentDirectory(rootPath, selectedPath, selectedKind);

  return (
    <div className="flex h-11 shrink-0 items-center gap-1.5 border-b border-border px-2">
      <Button variant="ghost" size="icon-sm" onClick={navigateBack}>
        <ArrowLeftIcon />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={navigateForward}>
        <ArrowRightIcon />
      </Button>

      <div className="mx-1 flex overflow-hidden rounded-md border border-border">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setView("columns")}
          className={cn("rounded-none", view === "columns" && "bg-secondary")}
        >
          <ColumnsIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setView("list")}
          className={cn("rounded-none", view === "list" && "bg-secondary")}
        >
          <LayoutListIcon />
        </Button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="font-mono text-xs">
            Sort: {SORT_LABELS[sortBy]}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {(Object.keys(SORT_LABELS) as FsSortBy[]).map((key) => (
            <DropdownMenuItem key={key} onSelect={() => setSort(key, key === sortBy ? !sortDesc : false)}>
              {SORT_LABELS[key]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="icon-sm" onClick={toggleShowHidden} title="Show hidden files">
        {showHidden ? <EyeIcon /> : <EyeOffIcon />}
      </Button>

      <NewFileMenu dir={dir} />

      <div className="flex-1" />

      <Button variant="ghost" size="sm" onClick={() => setMode("reclaim")}>
        <HardDriveIcon />
        Reclaim
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setMode("starters")}>
        <RocketIcon />
        Starters
      </Button>

    </div>
  );
}
