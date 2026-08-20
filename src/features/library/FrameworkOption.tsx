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
    <span className="flex items-center gap-2">
      {brand ? (
        <BrandIcon mark={brand} className="size-3.5" />
      ) : (
        <Fallback className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
      )}
      {frameworkLabel(framework)}
    </span>
  );
}
