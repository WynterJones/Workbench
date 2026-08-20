import { convertFileSrc } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { frameworkIcon } from "@/lib/format";
import type { Framework } from "@/lib/types";

interface ScreenshotThumbProps {
  screenshotPath: string | null;
  framework: Framework;
  name: string;
  className?: string;
}

export function ScreenshotThumb({
  screenshotPath,
  framework,
  name,
  className,
}: ScreenshotThumbProps) {
  const Icon = frameworkIcon(framework);

  if (!screenshotPath) {
    return (
      <div
        className={cn(
          "flex aspect-[16/10] w-full items-center justify-center rounded-t-lg bg-gradient-to-br from-secondary to-background",
          className
        )}
      >
        <Icon className="size-10 text-muted-foreground/40" strokeWidth={1.25} />
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
