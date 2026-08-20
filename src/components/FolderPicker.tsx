import { useState } from "react";
import { FolderIcon, HardDriveIcon, SearchIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { useFolderSearch } from "@/hooks/useFolderSearch";
import { truncatePath } from "@/lib/format";
import { api } from "@/lib/api";

interface FolderPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (path: string) => void;
  title?: string;
  description?: string;
}

export function FolderPicker({
  open,
  onOpenChange,
  onSelect,
  title = "Choose a destination",
  description = "Search your scanned folders, or browse for one.",
}: FolderPickerProps) {
  const [query, setQuery] = useState("");
  const { data, isLoading, isError, error, refetch } = useFolderSearch(query, open);

  function choose(path: string) {
    onSelect(path);
    onOpenChange(false);
    setQuery("");
  }

  async function browse() {
    const picked = await api.pickFolder();
    if (picked) choose(picked);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-3">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search folders by name…"
            className="pl-8"
          />
        </div>

        <div className="max-h-[340px] min-h-[200px] overflow-y-auto">
          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={() => refetch()}
            isEmpty={!data || data.length === 0}
            emptyMessage="No folders matched. Try a different name, or browse below."
            skeleton={
              <div className="space-y-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            }
          >
            <ul className="space-y-0.5">
              {(data ?? []).map((folder) => (
                <li key={folder.path}>
                  <button
                    type="button"
                    onClick={() => choose(folder.path)}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors duration-150 ease-out hover:bg-secondary"
                  >
                    {folder.isScanRoot ? (
                      <HardDriveIcon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    ) : (
                      <FolderIcon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">{folder.name}</span>
                      <span className="block truncate font-mono text-[11px] text-muted-foreground">
                        {truncatePath(folder.parent)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </QueryState>
        </div>

        <button
          type="button"
          onClick={browse}
          className="cursor-pointer rounded-md border border-border px-3 py-2 text-xs text-muted-foreground transition-colors duration-150 ease-out hover:bg-secondary hover:text-foreground"
        >
          Browse for a folder instead…
        </button>
      </DialogContent>
    </Dialog>
  );
}
