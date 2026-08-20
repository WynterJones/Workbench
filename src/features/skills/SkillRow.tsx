import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { SkillEntry } from "@/hooks/useSkills";

interface SkillRowProps {
  skill: SkillEntry;
  selected: boolean;
  onSelect: () => void;
  onToggle: (enabled: boolean) => void;
}

export function SkillRow({ skill, selected, onSelect, onToggle }: SkillRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 transition-colors duration-150 ease-out",
        selected ? "bg-secondary" : "hover:bg-secondary/60",
        !skill.enabled && "opacity-50",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{skill.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {skill.description || "No description"}
        </p>
      </div>
      <Switch
        checked={skill.enabled}
        onCheckedChange={onToggle}
        onClick={(event) => event.stopPropagation()}
        className="cursor-pointer"
      />
    </div>
  );
}
