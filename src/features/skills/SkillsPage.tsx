import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { SkillRow } from "@/features/skills/SkillRow";
import { SkillViewer } from "@/features/skills/SkillViewer";
import { InstallSkillPanel } from "@/features/skills/InstallSkillPanel";
import { useSkills, useToggleSkill } from "@/hooks/useSkills";

const AGENT_LABEL: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
};

export function SkillsPage() {
  const { data, isLoading, isError, error, refetch } = useSkills();
  const toggle = useToggleSkill();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const needle = search.toLowerCase();
    const filtered = (data ?? []).filter(
      (skill) =>
        skill.name.toLowerCase().includes(needle) ||
        skill.description.toLowerCase().includes(needle),
    );
    return Object.entries(
      filtered.reduce<Record<string, typeof filtered>>((acc, skill) => {
        (acc[skill.agent] ??= []).push(skill);
        return acc;
      }, {}),
    );
  }, [data, search]);

  return (
    <div className="flex h-full min-h-0">
      <div className="flex w-[340px] shrink-0 flex-col border-r border-border">
        <div className="shrink-0 space-y-2 border-b border-border p-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search skills…"
          />
          <InstallSkillPanel />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={() => refetch()}
            isEmpty={grouped.length === 0}
            emptyMessage="No skills installed for Claude Code or Codex yet."
            skeleton={
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            }
          >
            {grouped.map(([agent, skills]) => (
              <div key={agent} className="mb-4">
                <p className="px-2.5 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {AGENT_LABEL[agent] ?? agent} · {skills.length}
                </p>
                <div className="space-y-0.5">
                  {skills.map((skill) => (
                    <SkillRow
                      key={skill.id}
                      skill={skill}
                      selected={selected === skill.path}
                      onSelect={() => setSelected(skill.path)}
                      onToggle={(enabled) => toggle.mutate({ path: skill.path, enabled })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </QueryState>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <SkillViewer path={selected} />
      </div>
    </div>
  );
}
