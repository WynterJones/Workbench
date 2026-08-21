import { Markdown } from "@/components/Markdown";
import { cn } from "@/lib/utils";
import type { PortfolioMessage as Message } from "@/hooks/usePortfolio";

interface PortfolioMessageProps {
  message: Message;
  pending?: boolean;
}

export function PortfolioMessage({ message, pending = false }: PortfolioMessageProps) {
  if (message.role === "user") {
    return (
      <div
        className={cn(
          "ml-auto max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-secondary px-3.5 py-2 text-sm text-foreground",
          pending && "opacity-60",
        )}
      >
        {message.text}
      </div>
    );
  }

  return (
    <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-2.5 [&>div]:text-foreground/85 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm [&_li]:marker:text-muted-foreground/50 [&_ol]:mb-2 [&_ol]:ml-4 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_pre]:mb-2 [&_pre]:bg-background/60 [&_table]:mb-2 [&_ul]:mb-2 [&_ul]:ml-4 [&_ul:last-child]:mb-0">
      <Markdown>{message.text}</Markdown>
    </div>
  );
}
