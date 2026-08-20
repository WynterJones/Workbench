import { useMemo } from "react";
import { highlightLine, languageForExtension } from "@/features/files/lib/highlight";
import { useTextFile, textFileTooLarge } from "@/features/files/lib/useTextFile";
import { cn } from "@/lib/utils";

interface CodePreviewProps {
  path: string;
  extension: string | null;
  size: number | null;
}

const TONE_CLASS: Record<string, string> = {
  keyword: "text-[#c792ea]",
  string: "text-[#c3e88d]",
  comment: "text-muted-foreground/70",
  number: "text-[#f78c6c]",
  plain: "text-foreground/90",
};

export function CodePreview({ path, extension, size }: CodePreviewProps) {
  const { data: content, isLoading } = useTextFile(path, size);
  const lang = languageForExtension(extension);
  const lines = useMemo(() => (content ? content.split("\n") : []), [content]);

  if (textFileTooLarge(size)) {
    return <div className="p-4 text-xs text-muted-foreground">File too large to preview.</div>;
  }
  if (isLoading) {
    return <div className="p-4 text-xs text-muted-foreground">Loading…</div>;
  }
  if (content === undefined) {
    return <div className="p-4 text-xs text-muted-foreground">Can't preview this file.</div>;
  }

  return (
    <div className="h-full overflow-auto bg-background/40">
      <table className="w-full border-collapse font-mono text-[11px] leading-5">
        <tbody>
          {lines.map((line, index) => (
            <tr key={index} className="hover:bg-secondary/30">
              <td className="select-none px-2 text-right text-muted-foreground/40">{index + 1}</td>
              <td className="whitespace-pre px-2">
                {highlightLine(line, lang).map((token, i) => (
                  <span key={i} className={cn(TONE_CLASS[token.tone])}>
                    {token.text}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
