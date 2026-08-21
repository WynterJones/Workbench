import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";

const STAGES = [
  { after: 0, label: "Reading the code" },
  { after: 12, label: "Working through the repo" },
  { after: 35, label: "Piecing the story together" },
  { after: 75, label: "Still going — long repos take a while" },
];

export function PortfolioThinking() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const stage = [...STAGES].reverse().find((item) => seconds >= item.after) ?? STAGES[0];

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-sm text-muted-foreground">
      <Loader2Icon className="size-3.5 animate-spin" />
      <span>{stage.label}…</span>
      <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground/60">
        {seconds}s
      </span>
    </div>
  );
}
