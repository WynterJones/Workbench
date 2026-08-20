import { useState } from "react";
import { IntroStepWordmark } from "@/features/intro/IntroStepWordmark";
import { IntroStepDiagram } from "@/features/intro/IntroStepDiagram";
import { IntroStepFolders } from "@/features/intro/IntroStepFolders";
import { usePrefersReducedMotion } from "@/features/intro/usePrefersReducedMotion";
import { useAppStore } from "@/lib/store";
import { useSettings, useSaveSettings } from "@/hooks/useSettings";
import { useScan } from "@/hooks/useScan";
import type { Settings } from "@/lib/types";

const STEP_COUNT = 3;

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
  const reducedMotion = usePrefersReducedMotion();
  const setRoute = useAppStore((s) => s.setRoute);
  const { data: settings } = useSettings();
  const saveSettings = useSaveSettings();
  const { startScan } = useScan();

  function markSeen() {
    saveSettings.mutate({ ...(settings ?? FALLBACK_SETTINGS), introSeen: true });
    setRoute("library");
  }

  function finishAndScan() {
    markSeen();
    startScan();
  }

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-background px-6">
      <button
        type="button"
        onClick={markSeen}
        className="absolute right-6 top-6 z-20 text-xs text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
      >
        Skip
      </button>
      {step === 0 && <IntroStepWordmark reducedMotion={reducedMotion} onNext={() => setStep(1)} />}
      {step === 1 && <IntroStepDiagram reducedMotion={reducedMotion} onNext={() => setStep(2)} />}
      {step === 2 && <IntroStepFolders reducedMotion={reducedMotion} onFinish={finishAndScan} />}
      <div className="absolute bottom-8 flex gap-1.5">
        {Array.from({ length: STEP_COUNT }).map((_, index) => (
          <span
            key={index}
            className={`h-1 w-6 rounded-full transition-colors duration-150 ease-out ${
              index === step ? "bg-foreground" : "bg-secondary"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
