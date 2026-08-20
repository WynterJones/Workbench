import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

export interface SkillEntry {
  id: string;
  name: string;
  description: string;
  agent: "claude-code" | "codex";
  scope: string;
  path: string;
  enabled: boolean;
  hasScripts: boolean;
  hasReferences: boolean;
  fileCount: number;
  sizeBytes: number;
  modified: string | null;
  allowedTools: string[];
}

export interface SkillDetail {
  entry: SkillEntry;
  markdown: string;
  files: { path: string; sizeBytes: number }[];
}

const SKILLS_KEY = ["skills"];

export function useSkills() {
  return useQuery({ queryKey: SKILLS_KEY, queryFn: () => invoke<SkillEntry[]>("list_skills") });
}

export function useSkillDetail(path: string | null) {
  return useQuery({
    queryKey: ["skill", path],
    queryFn: () => invoke<SkillDetail>("read_skill", { path }),
    enabled: Boolean(path),
  });
}

export function useToggleSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ path, enabled }: { path: string; enabled: boolean }) =>
      invoke<string>("toggle_skill", { path, enabled }),
    onSuccess: (_, variables) => {
      toast.success(variables.enabled ? "Skill enabled" : "Skill disabled");
      queryClient.invalidateQueries({ queryKey: SKILLS_KEY });
    },
    onError: (error) =>
      toast.error("Could not change skill", {
        description: error instanceof Error ? error.message : String(error),
      }),
  });
}

export function useInstallSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pkg, agents }: { pkg: string; agents: string[] }) =>
      invoke<string>("install_skill", { pkg, agents }),
    onSuccess: () => {
      toast.success("Skill installed");
      queryClient.invalidateQueries({ queryKey: SKILLS_KEY });
    },
    onError: (error) =>
      toast.error("Install failed", {
        description: error instanceof Error ? error.message : String(error),
      }),
  });
}
