import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useShipScore(id: number | null) {
  return useQuery({
    queryKey: ["project", id, "shipScore"],
    queryFn: () => api.shipScore(id as number),
    enabled: id !== null,
  });
}
