import { cn } from "@/lib/utils";

interface MadeByProps {
  reducedMotion: boolean;
}

export function MadeBy({ reducedMotion }: MadeByProps) {
  return (
    <div
      className={cn(
        "absolute bottom-7 right-8 z-20 flex items-center gap-2.5 fill-mode-both",
        reducedMotion
          ? "animate-in fade-in duration-700"
          : "animate-in fade-in slide-in-from-bottom-2 duration-700",
      )}
      style={{ animationDelay: reducedMotion ? "400ms" : "1400ms" }}
    >
      <span className="text-[11px] tracking-wide text-muted-foreground">Made by</span>
      <img
        src="/wynter-ai.png"
        alt="Wynter.ai"
        draggable={false}
        className="h-5 w-auto select-none opacity-80"
      />
    </div>
  );
}
