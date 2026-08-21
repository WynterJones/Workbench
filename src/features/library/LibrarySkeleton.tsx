import { Skeleton } from "@/components/ui/skeleton";

interface LibrarySkeletonProps {
  count?: number;
  view?: "grid" | "list";
  columns?: number;
}

export function LibrarySkeleton({ count = 12, view = "grid", columns = view === "grid" ? 4 : 2 }: LibrarySkeletonProps) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={view === "list" ? "flex h-36 overflow-hidden rounded-lg border border-border bg-card" : "overflow-hidden rounded-lg border border-border bg-card"}
        >
          <Skeleton className={view === "list" ? "h-full w-[42%] shrink-0 rounded-none" : "aspect-[16/10] w-full rounded-none"} />
          <div className={view === "list" ? "flex min-w-0 flex-1 flex-col justify-center space-y-2 p-3" : "space-y-2 p-3"}>
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
