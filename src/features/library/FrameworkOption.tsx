import { BrandIcon } from "@/components/BrandIcon";
import { frameworkBrand } from "@/lib/brandIcons";
import { frameworkIcon, frameworkLabel } from "@/lib/format";
import type { Framework } from "@/lib/types";

interface FrameworkOptionProps {
  framework: Framework;
}

export function FrameworkOption({ framework }: FrameworkOptionProps) {
  const brand = frameworkBrand(framework);
  const Fallback = frameworkIcon(framework);

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-4 shrink-0 items-center justify-center">
        {brand ? (
          <BrandIcon mark={brand} className="max-h-4 max-w-4 size-auto" />
        ) : (
          <Fallback className="size-4 text-muted-foreground" strokeWidth={1.5} />
        )}
      </span>
      <span className="truncate">{frameworkLabel(framework)}</span>
    </span>
  );
}
