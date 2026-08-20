import { useEffect } from "react";
import { cn } from "@/lib/utils";

const LETTERS = "WORKBENCH".split("");

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
    <div className="relative flex flex-col items-center gap-4">
      {!reducedMotion && (
        <span
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-0 h-px animate-[intro-scan-sweep_1.8s_ease-out_forwards] bg-ok shadow-[0_0_16px_var(--ok)]"
        />
      )}
      <h1 className="relative z-10 flex whitespace-nowrap text-5xl font-bold tracking-[0.15em] text-foreground sm:text-6xl">
        {LETTERS.map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            className={cn(
              "inline-block fill-mode-both",
              reducedMotion ? "animate-in fade-in duration-500" : "animate-in fade-in slide-in-from-bottom-2 duration-500",
            )}
            style={{ animationDelay: `${index * 40}ms` }}
          >
            {letter}
          </span>
        ))}
      </h1>
      <p
        className="relative z-10 animate-in fade-in text-sm text-muted-foreground duration-700 fill-mode-both"
        style={{ animationDelay: reducedMotion ? "300ms" : "700ms" }}
      >
        Your prototypes, cataloged.
      </p>
    </div>
  );
}
