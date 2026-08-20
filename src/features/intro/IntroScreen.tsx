import { IntroBackdrop } from "@/features/intro/IntroBackdrop";
import { MadeBy } from "@/features/intro/MadeBy";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { IntroStepWordmark } from "@/features/intro/IntroStepWordmark";
import { IntroStepDiagram } from "@/features/intro/IntroStepDiagram";
import { IntroStepFolders } from "@/features/intro/IntroStepFolders";
import { IntroStepScan } from "@/features/intro/IntroStepScan";
import { usePrefersReducedMotion } from "@/features/intro/usePrefersReducedMotion";
import { useAppStore } from "@/lib/store";
import { useSettings, useSaveSettings } from "@/hooks/useSettings";
import { useScan } from "@/hooks/useScan";
import type { Settings } from "@/lib/types";

const STEP_COUNT = 4;

const FALLBACK_SETTINGS: Settings = {
  aiProvider: "claude-code",
  editor: "vscode",
  terminal: "terminal",
  autoScreenshot: true,
  concurrentRuns: 2,
  introSeen: false,
};

export function IntroScreen() {
  const [step, setStep] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const reducedMotion = usePrefersReducedMotion();
  const setRoute = useAppStore((s) => s.setRoute);
  const { data: settings } = useSettings();
  const saveSettings = useSaveSettings();
  const { startScan } = useScan();

  function markSeen() {
    saveSettings.mutate({ ...(settings ?? FALLBACK_SETTINGS), introSeen: true });
    setRoute("library");
  }

  function goToStep(next: number) {
    setAutoAdvance(false);
    setStep(next);
  }

  function finishAndScan() {
    markSeen();
    startScan();
  }

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-background px-6">
      <IntroBackdrop />
      <button
        type="button"
        onClick={markSeen}
        className="absolute right-6 top-6 z-20 text-xs text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
      >
        Skip
      </button>
      <div className="relative z-10 flex w-full flex-col items-center">
      {step === 0 && (
        <IntroStepWordmark
          reducedMotion={reducedMotion}
          autoAdvance={autoAdvance}
          onNext={() => setStep(1)}
        />
      )}
      {step === 1 && <IntroStepDiagram reducedMotion={reducedMotion} onNext={() => setStep(2)} />}
      {step === 2 && <IntroStepFolders reducedMotion={reducedMotion} onNext={() => goToStep(3)} />}
      {step === 3 && <IntroStepScan reducedMotion={reducedMotion} onFinish={finishAndScan} />}
      </div>
      <MadeBy reducedMotion={reducedMotion} />
      <div className="absolute bottom-8 z-20 flex gap-1.5">
        {Array.from({ length: STEP_COUNT }).map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Go to step ${index + 1}`}
            aria-current={index === step}
            onClick={() => goToStep(index)}
            className="group cursor-pointer p-1.5"
          >
            <span
              className={cn(
                "block h-1 w-6 rounded-full transition-colors duration-150 ease-out",
                index === step
                  ? "bg-brand"
                  : "bg-secondary group-hover:bg-muted-foreground/60",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
