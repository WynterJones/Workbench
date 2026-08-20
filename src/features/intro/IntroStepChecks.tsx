import { ArrowRightIcon } from "lucide-react";
import { CtaButton } from "@/components/CtaButton";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { SystemCheckRow } from "@/features/intro/SystemCheckRow";
import { useSystemChecks } from "@/hooks/useSystemChecks";
import { cn } from "@/lib/utils";

interface IntroStepChecksProps {
  reducedMotion: boolean;
  onNext: () => void;
}

export function IntroStepChecks({ reducedMotion, onNext }: IntroStepChecksProps) {
  const { data, isLoading, isError, error, refetch } = useSystemChecks();
  const missing = (data ?? []).filter((check) => !check.ok).length;

  return (
    <div
      className={cn(
        "flex w-full max-w-lg flex-col items-center gap-6 fill-mode-both",
        reducedMotion
          ? "animate-in fade-in duration-500"
          : "animate-in fade-in slide-in-from-bottom-2 duration-500",
      )}
    >
      <div className="space-y-2 text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground">
          {missing === 0 ? "Everything checks out." : "A few optional extras."}
        </h2>
        <p className="text-balance text-sm font-light leading-relaxed text-muted-foreground">
          {missing === 0
            ? "Every optional tool is installed. Nothing to do here."
            : "Workbench works without these. Install them later to unlock the features listed."}
        </p>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        compact
        skeleton={
          <div className="w-full space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        }
      >
        <ul className="w-full space-y-2">
          {(data ?? []).map((check) => (
            <SystemCheckRow key={check.id} check={check} />
          ))}
        </ul>
      </QueryState>

      <CtaButton size="lg" onClick={onNext}>
        Continue
        <ArrowRightIcon />
      </CtaButton>
    </div>
  );
}
