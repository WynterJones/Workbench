import { useEffect, useState } from "react";
import { ScanLine, Fingerprint, Play, Camera, LayoutGrid, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntroStepDiagramProps {
  reducedMotion: boolean;
  onNext: () => void;
}

interface DiagramNode {
  key: string;
  label: string;
  icon: LucideIcon;
}

const NODES: DiagramNode[] = [
  { key: "scan", label: "Scan", icon: ScanLine },
  { key: "identify", label: "Identify", icon: Fingerprint },
  { key: "run", label: "Run", icon: Play },
  { key: "screenshot", label: "Screenshot", icon: Camera },
  { key: "browse", label: "Browse", icon: LayoutGrid },
];

const NODE_X = [40, 190, 340, 490, 640];
const NODE_Y = 60;
const SEGMENT_MS = 480;
const START_DELAY_MS = 300;

export function IntroStepDiagram({ reducedMotion, onNext }: IntroStepDiagramProps) {
  const [active, setActive] = useState(reducedMotion ? NODES.length - 1 : -1);

  useEffect(() => {
    if (reducedMotion) return;
    const timers = NODES.map((_, index) =>
      setTimeout(() => setActive(index), index * SEGMENT_MS + START_DELAY_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion]);

  return (
    <div className="flex max-w-2xl flex-col items-center gap-8 animate-in fade-in duration-500 fill-mode-both">
      <p className="text-center text-base text-foreground">
        Point it at your folders. Workbench turns a messy filesystem into a visual catalog you can
        actually browse.
      </p>
      <svg viewBox="0 0 680 120" className="w-full max-w-xl">
        {NODE_X.slice(0, -1).map((x, index) => {
          const x2 = NODE_X[index + 1];
          const length = x2 - x - 40;
          const drawn = reducedMotion || active > index;
          return (
            <g key={index}>
              <line x1={x + 20} y1={NODE_Y} x2={x2 - 20} y2={NODE_Y} className="stroke-border" strokeWidth={2} />
              <line
                x1={x + 20}
                y1={NODE_Y}
                x2={x2 - 20}
                y2={NODE_Y}
                className="stroke-ok"
                strokeWidth={2}
                strokeDasharray={length}
                strokeDashoffset={drawn ? 0 : length}
                style={
                  reducedMotion
                    ? undefined
                    : {
                        transition: `stroke-dashoffset ${SEGMENT_MS}ms ease-out`,
                        transitionDelay: `${index * SEGMENT_MS + START_DELAY_MS}ms`,
                      }
                }
              />
            </g>
          );
        })}
        {NODE_X.map((x, index) => (
          <circle
            key={index}
            cx={x}
            cy={NODE_Y}
            r={18}
            strokeWidth={2}
            className={cn(
              "transition-colors duration-300 ease-out",
              reducedMotion || active >= index ? "fill-ok/15 stroke-ok" : "fill-card stroke-border",
            )}
          />
        ))}
      </svg>
      <div className="grid w-full max-w-xl grid-cols-5 gap-2 text-center">
        {NODES.map(({ key, label, icon: Icon }, index) => {
          const lit = reducedMotion || active >= index;
          return (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <Icon className={cn("size-4 transition-colors duration-300 ease-out", lit ? "text-ok" : "text-muted-foreground")} />
              <span className={cn("text-xs transition-colors duration-300 ease-out", lit ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onNext}
        className="text-sm font-medium text-foreground underline-offset-4 transition-colors duration-150 ease-out hover:underline"
      >
        Continue
      </button>
    </div>
  );
}
