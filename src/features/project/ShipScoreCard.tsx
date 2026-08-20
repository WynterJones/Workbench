import { CheckIcon, XIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useShipScore } from "@/hooks/useShipScore";
import { cn } from "@/lib/utils";

interface ShipScoreCardProps {
  projectId: number;
}

export function ShipScoreCard({ projectId }: ShipScoreCardProps) {
  const { data: shipScore, isLoading } = useShipScore(projectId);

  if (isLoading || !shipScore) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Ship score</span>
        <span className="text-xl font-semibold tabular-nums">{Math.round(shipScore.score)}</span>
      </div>
      <Progress value={shipScore.score} />
      <ul className="space-y-1.5">
        {shipScore.signals.map((signal) => (
          <li key={signal.key} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {signal.passed ? (
                <CheckIcon className="size-3 text-ok" strokeWidth={2} />
              ) : (
                <XIcon className="size-3 text-muted-foreground/60" strokeWidth={2} />
              )}
              <span className={cn(signal.passed && "text-foreground")}>{signal.label}</span>
            </span>
            <span className="text-muted-foreground/60">{signal.weight}pt</span>
          </li>
        ))}
      </ul>
      <p className="border-t border-border pt-2 text-xs text-muted-foreground">
        {shipScore.effortEstimate}
      </p>
    </div>
  );
}
