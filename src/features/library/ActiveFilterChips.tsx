import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { frameworkLabel } from "@/lib/format";
import type { Framework, ProjectStatus } from "@/lib/types";

interface ActiveFilterChipsProps {
  frameworks: Framework[];
  tags: string[];
  status: ProjectStatus | "all";
  statusLabels: Record<ProjectStatus, string>;
  onRemoveFramework: (framework: Framework) => void;
  onRemoveTag: (tag: string) => void;
  onClearStatus: () => void;
  onClearAll: () => void;
}

export function ActiveFilterChips({
  frameworks,
  tags,
  status,
  statusLabels,
  onRemoveFramework,
  onRemoveTag,
  onClearStatus,
  onClearAll,
}: ActiveFilterChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {frameworks.map((framework) => (
        <Badge key={framework} variant="secondary" className="gap-1 pr-1">
          {frameworkLabel(framework)}
          <button type="button" onClick={() => onRemoveFramework(framework)}>
            <XIcon className="size-2.5" />
          </button>
        </Badge>
      ))}
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button type="button" onClick={() => onRemoveTag(tag)}>
            <XIcon className="size-2.5" />
          </button>
        </Badge>
      ))}
      {status !== "all" && (
        <Badge variant="secondary" className="gap-1 pr-1">
          {statusLabels[status]}
          <button type="button" onClick={onClearStatus}>
            <XIcon className="size-2.5" />
          </button>
        </Badge>
      )}
      <Button variant="ghost" size="xs" onClick={onClearAll}>
        Clear all
      </Button>
    </div>
  );
}
