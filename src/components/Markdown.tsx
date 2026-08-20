import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { resolveAsset } from "@/lib/resolveAsset";

interface MarkdownProps {
  children: string;
  basePath?: string | null;
}

export function Markdown({ children, basePath = null }: MarkdownProps) {
  return (
    <div className="text-sm leading-relaxed text-muted-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: (props) => <h1 className="mb-3 mt-6 text-xl font-semibold text-foreground first:mt-0" {...props} />,
          h2: (props) => <h2 className="mb-2 mt-5 text-base font-semibold text-foreground first:mt-0" {...props} />,
          h3: (props) => <h3 className="mb-2 mt-4 text-sm font-semibold text-foreground first:mt-0" {...props} />,
          p: (props) => <p className="mb-3" {...props} />,
          a: (props) => <a className="text-foreground underline underline-offset-2 hover:opacity-80" target="_blank" rel="noreferrer" {...props} />,
          ul: (props) => <ul className="mb-3 ml-5 list-disc space-y-1" {...props} />,
          ol: (props) => <ol className="mb-3 ml-5 list-decimal space-y-1" {...props} />,
          code: ({ className, children: code, ...rest }) =>
            className?.includes("language-") ? (
              <code className="font-mono text-xs text-foreground" {...rest}>{code}</code>
            ) : (
              <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[12px] text-foreground" {...rest}>{code}</code>
            ),
          pre: (props) => (
            <pre className="mb-3 overflow-x-auto rounded-md border border-border bg-card p-3" {...props} />
          ),
          blockquote: (props) => (
            <blockquote className="mb-3 border-l-2 border-border pl-3 italic" {...props} />
          ),
          table: (props) => (
            <div className="mb-3 overflow-x-auto">
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
