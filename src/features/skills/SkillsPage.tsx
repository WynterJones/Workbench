import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { SkillSearchPanel } from "@/features/skills/SkillSearchPanel";
import { SkillAgentFilter, type SkillAgentFilterValue } from "@/features/skills/SkillAgentFilter";
import { AgentMarkIcon } from "@/features/models/AgentMarkIcon";
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
  const [agentFilter, setAgentFilter] = useState<SkillAgentFilterValue>("all");

  const installedNames = useMemo(
    () => new Set((data ?? []).map((skill) => skill.name.toLowerCase())),
    [data],
  );

  const agentCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, "claude-code": 0, codex: 0 };
    for (const skill of data ?? []) {
      counts.all += 1;
      counts[skill.agent] = (counts[skill.agent] ?? 0) + 1;
    }
    return counts;
  }, [data]);

  const grouped = useMemo(() => {
    const needle = search.toLowerCase();
    const filtered = (data ?? []).filter(
      (skill) =>
        (agentFilter === "all" || skill.agent === agentFilter) &&
        (skill.name.toLowerCase().includes(needle) ||
          skill.description.toLowerCase().includes(needle)),
    );
    return Object.entries(
      filtered.reduce<Record<string, typeof filtered>>((acc, skill) => {
        (acc[skill.agent] ??= []).push(skill);
        return acc;
      }, {}),
    );
  }, [data, search, agentFilter]);

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
        <div className="shrink-0 space-y-2 border-b border-border p-3">
          <SkillAgentFilter
            value={agentFilter}
            counts={agentCounts}
            onChange={setAgentFilter}
          />
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
            emptyTitle={agentFilter === "all" ? "No skills yet" : "Nothing for this agent"}
            emptyMessage={
              agentFilter === "all"
                ? "Find one in the Search tab to get started."
                : "Try All, or install one from the Search tab."
            }
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
                {agentFilter === "all" && (
                  <p className="flex items-center gap-2 px-2.5 pb-2 text-sm font-medium text-muted-foreground">
                    <AgentMarkIcon
                      agentId={agent}
                      vendor={agent === "codex" ? "OpenAI" : "Anthropic"}
                      className="size-4 text-current"
                    />
                    {AGENT_LABEL[agent] ?? agent} · {skills.length}
                  </p>
                )}
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
