import { Badge } from "@/components/ui/badge";
import { frameworkIcon, frameworkLabel } from "@/lib/format";
import type { Framework } from "@/lib/types";

interface FrameworkBadgeProps {
  framework: Framework;
  className?: string;
}

export function FrameworkBadge({ framework, className }: FrameworkBadgeProps) {
  const Icon = frameworkIcon(framework);

  return (
    <Badge variant="outline" className={className}>
      <Icon className="size-3" strokeWidth={1.5} />
      {frameworkLabel(framework)}
    </Badge>
  );
}
