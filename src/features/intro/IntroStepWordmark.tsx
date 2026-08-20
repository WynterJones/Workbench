import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface IntroStepWordmarkProps {
  reducedMotion: boolean;
  onNext: () => void;
}

export function IntroStepWordmark({ reducedMotion, onNext }: IntroStepWordmarkProps) {
  useEffect(() => {
    const timer = setTimeout(onNext, reducedMotion ? 1800 : 2600);
    return () => clearTimeout(timer);
  }, [onNext, reducedMotion]);

  return (
    <div className="relative flex flex-col items-center gap-5">
      {!reducedMotion && (
        <span
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-0 h-px animate-[intro-scan-sweep_1.8s_ease-out_forwards] bg-ok shadow-[0_0_16px_var(--ok)]"
        />
      )}
      <img
        src="/wordmark@2x.png"
        alt="Workbench"
        draggable={false}
        className={cn(
          "relative z-10 w-[min(560px,72vw)] select-none fill-mode-both",
          reducedMotion
            ? "animate-in fade-in duration-700"
            : "animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-700",
        )}
      />
      <p
        className="relative z-10 animate-in fade-in text-sm text-muted-foreground duration-700 fill-mode-both"
        style={{ animationDelay: reducedMotion ? "300ms" : "700ms" }}
      >
        Your prototypes, cataloged.
      </p>
    </div>
  );
}
