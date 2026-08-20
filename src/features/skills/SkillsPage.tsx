import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { SkillSearchPanel } from "@/features/skills/SkillSearchPanel";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { SkillRow } from "@/features/skills/SkillRow";
import { SkillViewer } from "@/features/skills/SkillViewer";
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
  const [tab, setTab] = useState<"installed" | "search">("installed");

  const installedNames = useMemo(
    () => new Set((data ?? []).map((skill) => skill.name.toLowerCase())),
    [data],
  );

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
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as "installed" | "search")}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <div className="shrink-0 border-b border-border p-2">
            <SegmentedTabs
              segments={[
                { value: "installed", label: "Installed", count: data?.length },
                { value: "search", label: "Search" },
              ]}
              value={tab}
              onChange={(value) => setTab(value as "installed" | "search")}
            />
          </div>

          <TabsContent value="search" className="min-h-0 flex-1">
            <SkillSearchPanel
              installedNames={installedNames}
              onInstalled={() => {
                setTab("installed");
                refetch();
              }}
            />
          </TabsContent>

          <TabsContent value="installed" className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="shrink-0 border-b border-border p-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter installed skills…"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={() => refetch()}
            isEmpty={grouped.length === 0}
            emptyTitle="No skills yet"
            emptyMessage="Install one with the field above, or browse skills.sh."
            compact
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
          </TabsContent>
        </Tabs>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <SkillViewer path={selected} />
      </div>
    </div>
  );
}
