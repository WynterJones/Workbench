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
    <div className="flex w-full max-w-5xl flex-col items-center gap-10 px-6">
      <div className="max-w-3xl space-y-4 text-center">
        <h2 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Your hard drive is a <span className="wb-gradient-text">portfolio</span> in disguise.
        </h2>
        <p className="text-balance text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
          Workbench finds every project you have ever built, runs them, screenshots them, and puts
          them all on one shelf — for people who ship faster than they can name folders.
        </p>
      </div>

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
