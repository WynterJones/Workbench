import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export interface RegistrySkill {
  id: string;
  owner: string;
  repo: string;
  skill: string;
  installs: number;
  installsLabel: string;
  url: string;
}

export function useSkillSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["skill-search", trimmed],
    queryFn: () => invoke<RegistrySkill[]>("search_skill_registry", { query: trimmed }),
    enabled: trimmed.length >= 2,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
