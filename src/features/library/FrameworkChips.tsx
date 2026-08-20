import { frameworkLabel } from "@/lib/format";
import type { Framework } from "@/lib/types";

interface FrameworkChipsProps {
  byFramework: Record<string, number>;
  limit?: number;
}

export function FrameworkChips({ byFramework, limit = 6 }: FrameworkChipsProps) {
  const ranked = Object.entries(byFramework)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (ranked.length === 0) return null;

  return (
    <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
      {ranked.map(([framework, count]) => (
        <span
          key={framework}
          className="flex shrink-0 items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground"
        >
          {frameworkLabel(framework as Framework)}
          <span className="tabular-nums opacity-70">{count}</span>
        </span>
      ))}
    </div>
  );
}
