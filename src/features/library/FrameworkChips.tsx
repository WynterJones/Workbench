import { BrandIcon } from "@/components/BrandIcon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { frameworkBrand } from "@/lib/brandIcons";
import { frameworkIcon, frameworkLabel } from "@/lib/format";
import type { Framework } from "@/lib/types";

interface FrameworkChipsProps {
  byFramework: Record<string, number>;
  limit?: number;
}

export function FrameworkChips({ byFramework, limit = 7 }: FrameworkChipsProps) {
  const ranked = Object.entries(byFramework)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (ranked.length === 0) return null;

  return (
    <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
      {ranked.map(([name, count]) => {
        const framework = name as Framework;
        const brand = frameworkBrand(framework);
        const Fallback = frameworkIcon(framework);
        return (
          <Tooltip key={name}>
            <TooltipTrigger asChild>
              <span className="flex shrink-0 items-center gap-1.5 rounded border border-border px-1.5 py-1">
                <span className="flex size-3.5 items-center justify-center">
                  {brand ? (
                    <BrandIcon mark={brand} className="size-3.5" />
                  ) : (
                    <Fallback className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                  )}
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {frameworkLabel(framework)} · {count}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
