import { BrandIcon } from "@/components/BrandIcon";
import { CheckboxDot } from "@/components/CheckboxDot";
import { frameworkBrand } from "@/lib/brandIcons";
import { frameworkIcon, frameworkLabel } from "@/lib/format";
import type { Framework } from "@/lib/types";

interface FrameworkOptionProps {
  framework: Framework;
  checked: boolean;
}

export function FrameworkOption({ framework, checked }: FrameworkOptionProps) {
  const brand = frameworkBrand(framework);
  const Fallback = frameworkIcon(framework);

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <CheckboxDot checked={checked} />
      <span className="flex size-4 shrink-0 items-center justify-center">
        {brand ? (
          <BrandIcon mark={brand} />
        ) : (
          <Fallback className="size-4 text-muted-foreground" strokeWidth={1.5} />
        )}
      </span>
      <span className="truncate">{frameworkLabel(framework)}</span>
    </span>
  );
}
