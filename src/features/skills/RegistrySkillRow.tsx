import { CheckIcon, DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RegistrySkill } from "@/hooks/useSkillSearch";

interface RegistrySkillRowProps {
  skill: RegistrySkill;
  installed: boolean;
  selected: boolean;
  onSelect: () => void;
  onInstall: () => void;
}

export function RegistrySkillRow({
  skill,
  installed,
  selected,
  onSelect,
  onInstall,
}: RegistrySkillRowProps) {
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
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{skill.skill}</p>
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          {skill.owner}/{skill.repo} · {skill.installsLabel}
        </p>
      </div>
      {installed ? (
        <span className="flex shrink-0 items-center gap-1 text-[11px] text-ok">
          <CheckIcon className="size-3" strokeWidth={3} />
          Installed
        </span>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-7 shrink-0 cursor-pointer"
          onClick={(event) => {
            event.stopPropagation();
            onInstall();
          }}
        >
          <DownloadIcon />
          Install
        </Button>
      )}
    </div>
  );
}
