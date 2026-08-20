import { FolderPlus, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CtaButton } from "@/components/CtaButton";
import { useScanRoots } from "@/hooks/useScanRoots";
import { cn } from "@/lib/utils";

interface IntroStepFoldersProps {
  reducedMotion: boolean;
  onFinish: () => void;
}

export function IntroStepFolders({ reducedMotion, onFinish }: IntroStepFoldersProps) {
  const { roots, pickAndAddRoot, removeRoot } = useScanRoots();

  return (
    <div
      className={cn(
        "flex w-full max-w-md flex-col items-center gap-6 fill-mode-both",
        reducedMotion
          ? "animate-in fade-in duration-500"
          : "animate-in fade-in slide-in-from-bottom-2 duration-500",
      )}
    >
      <div className="space-y-1.5 text-center">
        <h2 className="text-2xl font-semibold text-foreground">Point it at your folders</h2>
        <p className="text-sm text-muted-foreground">
          Workbench scans these roots for anything that looks like a project.
        </p>
      </div>
      <Button variant="outline" onClick={pickAndAddRoot} className="gap-2">
        <FolderPlus className="size-4" />
        Add a folder
      </Button>
      {roots.length > 0 && (
        <ul className="w-full space-y-1.5">
          {roots.map((root) => (
            <li
              key={root.id}
              className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
            >
              <span className="truncate font-mono text-xs text-muted-foreground">{root.path}</span>
              <button
                type="button"
                onClick={() => removeRoot(root.id)}
                className="text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
                aria-label={`Remove ${root.path}`}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <CtaButton size="lg" disabled={roots.length === 0} onClick={onFinish}>
        <ScanLine />
        Scan my drive
      </CtaButton>
    </div>
  );
}
