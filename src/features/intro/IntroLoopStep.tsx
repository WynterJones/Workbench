import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntroLoopStepProps {
  index: number;
  title: string;
  body: string;
  icon: LucideIcon;
  active: boolean;
}

export function IntroLoopStep({ index, title, body, icon: Icon, active }: IntroLoopStepProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-5 transition-all duration-500 ease-out",
        active
          ? "border-brand/40 bg-card opacity-100 translate-y-0"
          : "border-border bg-card/40 opacity-40 translate-y-1",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-lg transition-colors duration-500 ease-out",
            active ? "bg-brand text-background" : "bg-secondary text-muted-foreground",
          )}
        >
          <Icon className="size-5" strokeWidth={2} />
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          0{index + 1}
        </span>
      </div>
      <h3 className="text-xl font-bold tracking-tight text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
