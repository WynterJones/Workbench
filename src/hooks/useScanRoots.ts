import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ScanRoot } from "@/lib/types";

const ROOTS_KEY = ["roots"];

export function useScanRoots() {
  const queryClient = useQueryClient();
  const query = useQuery<ScanRoot[]>({ queryKey: ROOTS_KEY, queryFn: api.listRoots });

  const addRoot = useMutation({
    mutationFn: (path: string) => api.addRoot(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROOTS_KEY });
    },
  });

  const removeRoot = useMutation({
    mutationFn: (id: number) => api.removeRoot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROOTS_KEY });
    },
  });

  async function pickAndAddRoot() {
    const path = await api.pickFolder();
    if (!path) return;
    await addRoot.mutateAsync(path);
  }

  return {
    roots: query.data ?? [],
    isLoading: query.isLoading,
    pickAndAddRoot,
    removeRoot: removeRoot.mutate,
  };
}
