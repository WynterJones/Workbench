import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { FsEntry } from "@/lib/filesApi";
import { useContextCart } from "@/hooks/useContextCart";
import { resolveProjectRoot } from "@/features/files/lib/projectLookup";

export function useAddToCart() {
  const cart = useContextCart();
  const queryClient = useQueryClient();

  async function toggleEntry(entry: FsEntry) {
    if (cart.has(entry.path)) {
      cart.remove(entry.path);
      return;
    }
    const project = entry.projectFramework
      ? { root: entry.path, framework: entry.projectFramework }
      : await resolveProjectRoot(queryClient, entry.path);
    cart.add({
      path: entry.path,
      name: entry.name,
      kind: entry.kind,
      projectRoot: project?.root ?? null,
      projectLabel: project?.framework ?? null,
    });
    toast.success(`Added ${entry.name} to cart`);
  }

  return { toggleEntry, has: cart.has, count: cart.count };
}
