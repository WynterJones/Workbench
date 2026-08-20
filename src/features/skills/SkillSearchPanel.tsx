import { useState } from "react";
import { Input } from "@/components/ui/input";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { RegistrySkillRow } from "@/features/skills/RegistrySkillRow";
import { InstallSkillDialog } from "@/features/skills/InstallSkillDialog";
import { useDebounced } from "@/hooks/useDebounced";
import { useSkillSearch, type RegistrySkill } from "@/hooks/useSkillSearch";
import { openUrl } from "@/lib/openUrl";

interface SkillSearchPanelProps {
  installedNames: Set<string>;
  onInstalled: () => void;
}

export function SkillSearchPanel({ installedNames, onInstalled }: SkillSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [installing, setInstalling] = useState<RegistrySkill | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const debounced = useDebounced(query);
  const { data, isLoading, isError, error, refetch } = useSkillSearch(debounced);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border p-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search skills.sh…"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {debounced.trim().length < 2 ? (
          <div className="space-y-2 px-2 py-8 text-center">
            <p className="text-sm text-muted-foreground">Search the skills.sh registry.</p>
            <button
              type="button"
              onClick={() => openUrl("https://skills.sh")}
              className="cursor-pointer text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Browse skills.sh
            </button>
          </div>
        ) : (
          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={() => refetch()}
            isEmpty={!data || data.length === 0}
            emptyTitle="No skills matched"
            emptyMessage="Try a different term, or install a repo directly from the Installed tab."
            compact
            skeleton={
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            }
          >
            <div className="space-y-0.5">
              {(data ?? []).map((skill) => (
                <RegistrySkillRow
                  key={skill.id}
                  skill={skill}
                  installed={installedNames.has(skill.skill.toLowerCase())}
                  selected={selected === skill.id}
                  onSelect={() => setSelected(skill.id)}
                  onInstall={() => setInstalling(skill)}
                />
              ))}
            </div>
          </QueryState>
        )}
      </div>

      <InstallSkillDialog
        skill={installing}
        onOpenChange={(open) => !open && setInstalling(null)}
        onInstalled={onInstalled}
      />
    </div>
  );
}
