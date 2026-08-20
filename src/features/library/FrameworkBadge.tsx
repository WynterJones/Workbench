import { Badge } from "@/components/ui/badge";
import { BrandIcon } from "@/components/BrandIcon";
import { frameworkBrand } from "@/lib/brandIcons";
import { frameworkIcon, frameworkLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Framework } from "@/lib/types";

interface FrameworkBadgeProps {
  framework: Framework;
  className?: string;
  onClick?: () => void;
}

export function FrameworkBadge({ framework, className, onClick }: FrameworkBadgeProps) {
  const brand = frameworkBrand(framework);
  const Fallback = frameworkIcon(framework);

  const content = (
    <>
      {brand ? (
        <BrandIcon mark={brand} className="size-3" />
      ) : (
        <Fallback className="size-3" strokeWidth={1.5} />
      )}
      {frameworkLabel(framework)}
    </>
  );

  if (!onClick) {
    return (
      <Badge variant="outline" className={className}>
        {content}
      </Badge>
    );
  }

  return (
    <Badge asChild variant="outline" className={cn("cursor-pointer hover:bg-accent", className)}>
      <button type="button" onClick={onClick} title={`Show all ${frameworkLabel(framework)} projects`}>
        {content}
      </button>
    </Badge>
  );
}
