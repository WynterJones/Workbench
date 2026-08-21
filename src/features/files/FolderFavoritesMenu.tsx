import { FolderIcon, StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { currentDirectory, baseName, parentPath } from "@/features/files/lib/paths";
import { useFilesStore } from "@/lib/filesStore";
import { useUserPreferences } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";

export function FolderFavoritesMenu() {
  const rootPath = useFilesStore((state) => state.rootPath);
  const selectedPath = useFilesStore((state) => state.selectedPath);
  const selectedKind = useFilesStore((state) => state.selectedKind);
  const setRoot = useFilesStore((state) => state.setRoot);
  const favorites = useUserPreferences((state) => state.favoriteFolders);
  const toggleFavorite = useUserPreferences((state) => state.toggleFavoriteFolder);
  const dir = currentDirectory(rootPath, selectedPath, selectedKind);
  const isFavorite = favorites.includes(dir);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Favorite folders">
          <StarIcon className={cn(isFavorite && "fill-brand text-brand")} />
          Favorites
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuItem onSelect={() => toggleFavorite(dir)} className="cursor-pointer">
          <StarIcon className={cn(isFavorite && "fill-brand text-brand")} />
          {isFavorite ? "Unstar current folder" : "Star current folder"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Saved folders</DropdownMenuLabel>
        {favorites.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">Star a folder to keep it here.</p>
        ) : (
          favorites.map((path) => (
            <DropdownMenuItem key={path} onSelect={() => setRoot(path)} className="cursor-pointer">
              <FolderIcon />
              <span className="min-w-0 flex-1 truncate">{baseName(path)}</span>
              <span className="max-w-28 truncate font-mono text-[10px] text-muted-foreground">
                {parentPath(path)}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
