import { BrandIcon } from "@/components/BrandIcon";
import { brandByName } from "@/lib/brandIcons";
import { iconForEntry } from "@/features/files/lib/icons";
import type { FsEntry } from "@/lib/filesApi";

interface EntryIconProps {
  entry: FsEntry;
}

export function EntryIcon({ entry }: EntryIconProps) {
  const brand = entry.projectFramework ? brandByName(entry.projectFramework) : null;

  if (brand) {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center">
        <BrandIcon mark={brand} className="size-4" />
      </span>
    );
  }

  const Icon = iconForEntry(entry);
  return <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />;
}
