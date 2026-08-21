import { convertFileSrc } from "@tauri-apps/api/core";
import { frameworkIcon } from "@/lib/format";
import { faviconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

interface ProjectIconProps {
  project: Project;
  className?: string;
}

export function ProjectIcon({ project, className }: ProjectIconProps) {
  const Fallback = frameworkIcon(project.framework);
  const source = project.iconPath ? convertFileSrc(project.iconPath) : faviconUrl(project.homepage);

  return (
    <span
      className={cn(
        "relative flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary text-muted-foreground",
        className,
      )}
    >
      <Fallback className="size-3/5" strokeWidth={1.75} />
      {source && (
        <img
          key={source}
          src={source}
          alt=""
          draggable={false}
          className="absolute inset-0 size-full bg-card object-contain"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
    </span>
  );
}
