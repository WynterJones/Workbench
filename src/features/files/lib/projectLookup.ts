import type { QueryClient } from "@tanstack/react-query";
import { filesApi } from "@/lib/filesApi";
import { parentPath } from "@/features/files/lib/paths";

export async function resolveProjectRoot(
  queryClient: QueryClient,
  path: string
): Promise<{ root: string; framework: string | null } | null> {
  let cur = path;
  for (let i = 0; i < 12 && cur && cur !== "/"; i++) {
    try {
      const info = await queryClient.fetchQuery({
        queryKey: ["fs-info", cur],
        queryFn: () => filesApi.getInfo(cur),
        staleTime: 60_000,
      });
      if (info.isProject) return { root: cur, framework: info.framework };
    } catch {
      return null;
    }
    cur = parentPath(cur);
  }
  return null;
}
