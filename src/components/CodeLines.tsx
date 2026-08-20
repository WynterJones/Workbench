import { tokenize, type TokenKind } from "@/lib/highlight";

const KIND_CLASS: Record<TokenKind, string> = {
  keyword: "text-brand/90",
  string: "text-emerald-400/80",
  comment: "text-muted-foreground/45",
  number: "text-sky-300/80",
  plain: "text-foreground/70",
};

interface CodeLinesProps {
  lines: string[];
  showLineNumbers?: boolean;
}

export function CodeLines({ lines, showLineNumbers }: CodeLinesProps) {
  return (
    <pre className="overflow-hidden font-mono text-[10px] leading-[1.5]">
      {lines.map((line, index) => (
        <div key={index} className="flex gap-2 whitespace-pre">
          {showLineNumbers && (
            <span className="w-4 shrink-0 select-none text-right text-muted-foreground/30">
              {index + 1}
            </span>
          )}
          <span className="min-w-0">
            {tokenize(line).map((token, tokenIndex) => (
              <span key={tokenIndex} className={KIND_CLASS[token.kind]}>
                {token.text}
              </span>
            ))}
          </span>
        </div>
      ))}
    </pre>
  );
}
