import { Loader2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScan } from "@/hooks/useScan";

function truncateFromLeft(path: string, max: number) {
  if (path.length <= max) return path;
  return `…${path.slice(path.length - max + 1)}`;
}

export function ScanButton() {
  const { startScan, isScanning, progress } = useScan();

  if (isScanning && progress) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-1.5">
        <Loader2 className="size-4 shrink-0 animate-spin text-foreground" />
        <div className="flex flex-col leading-tight">
          <span className="font-mono text-xs text-foreground">
            {progress.scanned} scanned · {progress.found} found
          </span>
          <span className="max-w-[280px] truncate font-mono text-[11px] text-muted-foreground">
            {truncateFromLeft(progress.currentPath, 46) || "starting…"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Button onClick={startScan} className="gap-2">
      <ScanLine className="size-4" />
      Scan &amp; Refresh Library
    </Button>
  );
}
