import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { resolveAsset } from "@/lib/resolveAsset";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  children: string;
  basePath?: string | null;
  variant?: "default" | "dossier";
}

export function Markdown({ children, basePath = null, variant = "default" }: MarkdownProps) {
  const dossier = variant === "dossier";

  return (
    <div
      className={cn(
        "text-sm leading-relaxed text-muted-foreground",
        dossier && "mx-auto max-w-3xl font-serif text-[15px] leading-7 text-foreground/75",
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: (props) => (
            <h1
              className={cn(
                "mb-3 mt-6 text-xl font-semibold text-foreground first:mt-0",
                dossier && "mb-5 mt-10 text-3xl font-bold leading-tight tracking-tight",
              )}
              {...props}
            />
          ),
          h2: (props) => (
            <h2
              className={cn(
                "mb-2 mt-5 text-base font-semibold text-foreground first:mt-0",
                dossier && "mb-4 mt-9 border-b border-brand/20 pb-2 text-xl font-bold leading-tight",
              )}
              {...props}
            />
          ),
          h3: (props) => (
            <h3
              className={cn(
                "mb-2 mt-4 text-sm font-semibold text-foreground first:mt-0",
                dossier && "mb-3 mt-7 text-lg font-bold leading-tight",
              )}
              {...props}
            />
          ),
          p: (props) => <p className={cn("mb-3", dossier && "mb-5 text-justify")} {...props} />,
          a: (props) => <a className="text-foreground underline underline-offset-2 hover:opacity-80" target="_blank" rel="noreferrer" {...props} />,
          ul: (props) => <ul className={cn("mb-3 ml-5 list-disc space-y-1", dossier && "mb-5 ml-7 space-y-2 marker:text-brand/70")} {...props} />,
          ol: (props) => <ol className={cn("mb-3 ml-5 list-decimal space-y-1", dossier && "mb-5 ml-7 space-y-2 marker:text-brand/70")} {...props} />,
          code: ({ className, children: code, ...rest }) =>
            className?.includes("language-") ? (
              <code className="font-mono text-xs text-foreground" {...rest}>{code}</code>
            ) : (
              <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[12px] text-foreground" {...rest}>{code}</code>
            ),
          pre: (props) => (
            <pre className={cn("mb-3 overflow-x-auto rounded-md border border-border bg-card p-3", dossier && "mb-6 p-4")} {...props} />
          ),
          blockquote: (props) => (
            <blockquote className={cn("mb-3 border-l-2 border-border pl-3 italic", dossier && "mb-6 border-brand/50 py-1 pl-5 text-foreground/70")} {...props} />
          ),
          table: (props) => (
            <div className={cn("mb-3 overflow-x-auto", dossier && "mb-6 rounded-md border border-brand/20")}>
              <table className="w-full border-collapse text-xs" {...props} />
            </div>
          ),
          th: (props) => <th className="border border-border px-2 py-1 text-left font-medium text-foreground" {...props} />,
          td: (props) => <td className="border border-border px-2 py-1" {...props} />,
          img: ({ src, ...rest }) => (
            <img
              {...rest}
              src={resolveAsset(typeof src === "string" ? src : undefined, basePath)}
              loading="lazy"
              className="my-2 inline-block max-w-full rounded"
            />
          ),
          hr: () => <hr className="my-4 border-border" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
