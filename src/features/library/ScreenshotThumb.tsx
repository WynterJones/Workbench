import { convertFileSrc } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { CodePeek } from "@/features/library/CodePeek";
import { frameworkIcon } from "@/lib/format";
import type { Framework } from "@/lib/types";

interface ScreenshotThumbProps {
  screenshotPath: string | null;
  framework: Framework;
  name: string;
  projectId?: number;
  className?: string;
}

export function ScreenshotThumb({
  screenshotPath,
  framework,
  name,
  projectId,
  className,
}: ScreenshotThumbProps) {
  const Icon = frameworkIcon(framework);

  if (!screenshotPath) {
    return (
      <div
        className={cn(
          "relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-t-lg bg-gradient-to-br from-secondary to-background",
          className
        )}
      >
        <Icon className="size-10 text-muted-foreground/30" strokeWidth={1.25} />
        {projectId !== undefined && <CodePeek projectId={projectId} />}
      </div>
    );
  }

  return (
    <div className={cn("aspect-[16/10] w-full overflow-hidden rounded-t-lg bg-secondary", className)}>
      <img
        src={convertFileSrc(screenshotPath)}
        alt={`${name} screenshot`}
        loading="lazy"
        className="size-full object-cover object-top"
      />
    </div>
  );
}
