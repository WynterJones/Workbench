import { useState } from "react";
import { CopyIcon, EyeIcon, Loader2Icon, PencilIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/Markdown";
import { Textarea } from "@/components/ui/textarea";
import { usePortfolioDoc } from "@/hooks/usePortfolio";
import type { AiProvider } from "@/lib/types";

interface PortfolioOutputProps {
  projectId: number;
  provider: AiProvider;
  imagesDir: string;
  doc: string;
}

export function PortfolioOutput({ projectId, provider, imagesDir, doc }: PortfolioOutputProps) {
  const { generate, save } = usePortfolioDoc(projectId, provider);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(doc);

  function startEditing() {
    setDraft(doc);
    setEditing(true);
  }

  if (generate.isPending) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-5 animate-spin" />
        Writing the piece — this takes a minute or two.
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">
          A blog-post style write-up of this project, in your voice, using your screenshots and
          everything you said in the chat.
        </p>
        <Button size="sm" onClick={() => generate.mutate()} className="cursor-pointer">
          <SparklesIcon />
          Write the portfolio piece
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <Button
              size="sm"
              onClick={() => {
                save.mutate(draft);
                setEditing(false);
              }}
              className="cursor-pointer"
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="cursor-pointer">
              Cancel
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={startEditing} className="cursor-pointer">
            <PencilIcon />
            Edit
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(doc);
            toast.success("Markdown copied");
          }}
          className="cursor-pointer"
        >
          <CopyIcon />
          Copy markdown
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => generate.mutate()}
          className="cursor-pointer"
        >
          <SparklesIcon />
          Rewrite
        </Button>
        {editing && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <EyeIcon className="size-3" />
            Save to see it rendered
          </span>
        )}
      </div>

      {editing ? (
        <Textarea
          rows={22}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="font-mono text-xs"
        />
      ) : (
        <div className="max-h-[560px] overflow-y-auto pr-2">
          <Markdown basePath={imagesDir}>{doc}</Markdown>
        </div>
      )}
    </div>
  );
}
