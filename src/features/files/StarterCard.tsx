import { Badge } from "@/components/ui/badge";
import type { StarterTemplate } from "@/lib/filesApi";

interface StarterCardProps {
  starter: StarterTemplate;
  onSelect: () => void;
}

export function StarterCard({ starter, onSelect }: StarterCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="cursor-pointer group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-muted-foreground/40"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">{starter.name}</span>
        {starter.useCount !== undefined && starter.useCount > 0 && (
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">×{starter.useCount}</span>
        )}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{starter.description}</p>
      <div className="flex flex-wrap gap-1">
        {starter.stack.map((tech) => (
          <Badge key={tech} variant="secondary" className="text-[10px]">
            {tech}
          </Badge>
        ))}
      </div>
      <code className="mt-1 truncate rounded bg-secondary/60 px-2 py-1 font-mono text-[11px] text-muted-foreground group-hover:text-foreground">
        {starter.command}
      </code>
    </button>
  );
}
