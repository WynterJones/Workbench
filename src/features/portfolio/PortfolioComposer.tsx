import { useState } from "react";
import { ArrowUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AiProvider } from "@/lib/types";

interface PortfolioComposerProps {
  provider: AiProvider;
  disabled: boolean;
  onSend: (message: string) => void;
}

export function PortfolioComposer({ provider, disabled, onSend }: PortfolioComposerProps) {
  const [draft, setDraft] = useState("");

  function submit() {
    const message = draft.trim();
    if (!message || disabled) return;
    setDraft("");
    onSend(message);
  }

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-2.5 focus-within:border-muted-foreground/40">
      <Textarea
        rows={1}
        value={draft}
        disabled={disabled}
        placeholder="Ask about the challenges, the trade-offs, what to show off…"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        className="max-h-40 min-h-0 resize-none border-0 bg-transparent px-1.5 py-1 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
      />
      <div className="flex items-center justify-between gap-2 pl-1.5 pt-1.5">
        <span className="text-[11px] text-muted-foreground/70">
          {provider === "codex" ? "Codex" : "Claude Code"} · ⏎ to send, ⇧⏎ for a new line
        </span>
        <Button
          size="icon"
          onClick={submit}
          disabled={!draft.trim() || disabled}
          aria-label="Send"
          className="size-7 cursor-pointer rounded-full"
        >
          <ArrowUpIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
