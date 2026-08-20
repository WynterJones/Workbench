import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAppVersion } from "@/hooks/useAppVersion";

interface IntroStepWordmarkProps {
  reducedMotion: boolean;
  autoAdvance: boolean;
  onNext: () => void;
}

export function IntroStepWordmark({
  reducedMotion,
  autoAdvance,
  onNext,
}: IntroStepWordmarkProps) {
  const version = useAppVersion();

  useEffect(() => {
    if (!autoAdvance) return;
    const timer = setTimeout(onNext, reducedMotion ? 1800 : 2800);
    return () => clearTimeout(timer);
  }, [autoAdvance, onNext, reducedMotion]);

  return (
    <div className="relative flex flex-col items-center gap-4">
      <img
        src="/wordmark@2x.png"
        alt="Workbench"
        draggable={false}
        className={cn(
          "w-[min(560px,72vw)] select-none fill-mode-both",
          reducedMotion
            ? "animate-in fade-in duration-500"
            : "animate-[intro-pop_700ms_cubic-bezier(0.34,1.56,0.64,1)_both]",
        )}
      />
      <p
        className="animate-in fade-in font-mono text-xs text-muted-foreground duration-700 fill-mode-both"
        style={{ animationDelay: reducedMotion ? "250ms" : "650ms" }}
      >
        {version ? `v${version}` : ""}
      </p>
    </div>
  );
}
