import { useEffect, useRef, useState } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortfolioComposer } from "@/features/portfolio/PortfolioComposer";
import { PortfolioMessage } from "@/features/portfolio/PortfolioMessage";
import { PortfolioThinking } from "@/features/portfolio/PortfolioThinking";
import { usePortfolioChat, type PortfolioMessage as Message } from "@/hooks/usePortfolio";
import type { AiProvider } from "@/lib/types";

interface PortfolioChatProps {
  projectId: number;
  provider: AiProvider;
  messages: Message[];
}

const STARTERS = [
  "Read the code and tell me what the hardest problem in here was.",
  "What is genuinely unusual about how this is built?",
  "What would you say this project proves I can do?",
];

export function PortfolioChat({ projectId, provider, messages }: PortfolioChatProps) {
  const { send, clear } = usePortfolioChat(projectId, provider);
  const [pending, setPending] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending]);

  function submit(message: string) {
    setPending(message);
    send.mutate(message, { onSettled: () => setPending(null) });
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          The agent reads this repo with you and finds the story worth telling.
        </p>
        {messages.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => clear.mutate()}
            className="cursor-pointer text-muted-foreground"
          >
            <Trash2Icon />
            Clear
          </Button>
        )}
      </div>

      <div className="min-h-[260px] flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && !pending && (
          <div className="space-y-2">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => submit(starter)}
                className="block w-full cursor-pointer rounded-xl border border-border bg-card/50 px-3.5 py-2.5 text-left text-sm text-muted-foreground transition-colors duration-150 ease-out hover:border-muted-foreground/40 hover:text-foreground"
              >
                {starter}
              </button>
            ))}
          </div>
        )}

        {messages.map((message, index) => (
          <PortfolioMessage key={`${index}-${message.role}`} message={message} />
        ))}

        {pending && <PortfolioMessage message={{ role: "user", text: pending }} pending />}
        {send.isPending && <PortfolioThinking />}
        <div ref={bottom} />
      </div>

      <PortfolioComposer provider={provider} disabled={send.isPending} onSend={submit} />
    </div>
  );
}
