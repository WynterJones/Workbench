import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSavePortfolioVoice, type PortfolioVoice as Voice } from "@/hooks/usePortfolio";

interface PortfolioVoiceProps {
  projectId: number;
  voice: Voice;
}

const FIELDS: { key: keyof Voice; label: string; placeholder: string }[] = [
  {
    key: "audience",
    label: "Who is this for?",
    placeholder: "Hiring managers who skim, other developers, potential clients…",
  },
  {
    key: "tone",
    label: "How should it sound?",
    placeholder: "Dry and technical, warm and personal, short sentences, no hype…",
  },
  {
    key: "takeaway",
    label: "What should they walk away thinking?",
    placeholder: "That I can take a vague idea to a shipped desktop app on my own…",
  },
];

export function PortfolioVoice({ projectId, voice }: PortfolioVoiceProps) {
  const [draft, setDraft] = useState<Voice>(voice);
  const save = useSavePortfolioVoice(projectId);
  const dirty = FIELDS.some((field) => draft[field.key] !== voice[field.key]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Three answers that set the voice. Everything written here is shaped by them.
      </p>

      {FIELDS.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <Label htmlFor={`voice-${field.key}`}>{field.label}</Label>
          <Textarea
            id={`voice-${field.key}`}
            rows={2}
            value={draft[field.key]}
            placeholder={field.placeholder}
            onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
          />
        </div>
      ))}

      <Button
        size="sm"
        onClick={() => save.mutate(draft)}
        disabled={!dirty || save.isPending}
        className="cursor-pointer"
      >
        {save.isPending ? "Saving…" : "Save voice"}
      </Button>
    </div>
  );
}
