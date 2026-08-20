import { useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ShelfId } from "@/lib/types";

const SHELVES: ShelfId[] = [
  "continue",
  "gems",
  "discovered",
  "shipped",
  "experiments",
  "attention",
  "dead",
  "all",
];

export function useShelfCounts(): Record<ShelfId, number> {
  const results = useQueries({
    queries: SHELVES.map((shelf) => ({
      queryKey: ["shelf-count", shelf],
      queryFn: () =>
        api
          .listProjects({ shelf, search: "", frameworks: [], tags: [], sort: "modified" })
          .then((rows) => rows.length),
      staleTime: 15_000,
    })),
  });

  return SHELVES.reduce(
    (acc, shelf, index) => {
      acc[shelf] = results[index].data ?? 0;
      return acc;
    },
    {} as Record<ShelfId, number>,
  );
}
