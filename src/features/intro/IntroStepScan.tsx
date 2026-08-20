import { ScanLine } from "lucide-react";
import { CtaButton } from "@/components/CtaButton";
import { useScanRoots } from "@/hooks/useScanRoots";
import { cn } from "@/lib/utils";

interface IntroStepScanProps {
  reducedMotion: boolean;
  onFinish: () => void;
}

export function IntroStepScan({ reducedMotion, onFinish }: IntroStepScanProps) {
  const { roots } = useScanRoots();

  return (
    <div
      className={cn(
        "flex w-full max-w-lg flex-col items-center gap-7 fill-mode-both",
        reducedMotion
          ? "animate-in fade-in duration-500"
          : "animate-in fade-in slide-in-from-bottom-2 duration-500",
      )}
    >
      <div className="space-y-3 text-center">
        <h2 className="text-balance text-4xl font-bold leading-tight tracking-tight text-foreground">
          Ready when you are.
        </h2>
        <p className="text-balance text-base font-light leading-relaxed text-muted-foreground">
          Workbench reads {roots.length === 1 ? "this folder" : `these ${roots.length} folders`} and
          catalogs every project it finds. Nothing runs, nothing leaves your machine.
        </p>
      </div>

      <ul className="w-full space-y-1.5">
        {roots.map((root) => (
          <li
            key={root.id}
            className="truncate rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-muted-foreground"
          >
            {root.path}
          </li>
        ))}
      </ul>

      <CtaButton size="lg" onClick={onFinish}>
        <ScanLine />
        Scan my drive
      </CtaButton>
    </div>
  );
}
