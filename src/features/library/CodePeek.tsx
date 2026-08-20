import { FileCode2Icon } from "lucide-react";
import { CodeLines } from "@/components/CodeLines";
import { useSnippet } from "@/hooks/useSnippet";

interface CodePeekProps {
  projectId: number;
}

export function CodePeek({ projectId }: CodePeekProps) {
  const { data } = useSnippet(projectId, true);

  if (!data || data.lines.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-4 flex justify-center px-5">
      <div className="w-full max-w-[260px] translate-y-2 rotate-[-1.5deg] overflow-hidden rounded-t-md border border-border/80 bg-[#0d0d10] shadow-[0_-2px_24px_-8px_rgba(0,0,0,0.9)] transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:rotate-0">
        <div className="flex items-center gap-1.5 border-b border-border/60 bg-card px-2 py-1">
          <FileCode2Icon className="size-2.5 shrink-0 text-muted-foreground/60" strokeWidth={2} />
          <span className="truncate font-mono text-[9px] text-muted-foreground/70">{data.file}</span>
        </div>
        <div className="relative px-2 py-1.5">
          <CodeLines lines={data.lines} />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0d0d10] to-transparent" />
        </div>
      </div>
    </div>
  );
}
