import { useEffect, useState } from "react";
import { Camera, LayoutGrid, ScanLine, type LucideIcon } from "lucide-react";
import { IntroLoopStep } from "@/features/intro/IntroLoopStep";
import { CtaButton } from "@/components/CtaButton";

interface IntroStepDiagramProps {
  reducedMotion: boolean;
  onNext: () => void;
}

interface LoopStep {
  key: string;
  title: string;
  body: string;
  icon: LucideIcon;
}

const STEPS: LoopStep[] = [
  {
    key: "scan",
    title: "Scan",
    body: "Point it at your drives. Every project gets found and identified by framework.",
    icon: ScanLine,
  },
  {
    key: "capture",
    title: "Capture",
    body: "Workbench runs the ones you trust and takes real screenshots of them.",
    icon: Camera,
  },
  {
    key: "browse",
    title: "Browse",
    body: "A visual catalog of everything you have ever built, searchable in seconds.",
    icon: LayoutGrid,
  },
];

const STEP_MS = 620;

export function IntroStepDiagram({ reducedMotion, onNext }: IntroStepDiagramProps) {
  const [active, setActive] = useState(reducedMotion ? STEPS.length - 1 : -1);

  useEffect(() => {
    if (reducedMotion) return;
    const timers = STEPS.map((_, index) =>
      setTimeout(() => setActive(index), index * STEP_MS + 250),
    );
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion]);

  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-12 px-6">
      <h2 className="max-w-2xl text-center text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
        Turn a messy filesystem into a<span className="text-brand"> visual catalog</span>.
      </h2>

      <div className="grid w-full gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <IntroLoopStep
            key={step.key}
            index={index}
            title={step.title}
            body={step.body}
            icon={step.icon}
            active={active >= index}
          />
        ))}
      </div>

      <CtaButton size="lg" onClick={onNext}>
        Continue
      </CtaButton>
    </div>
  );
}
