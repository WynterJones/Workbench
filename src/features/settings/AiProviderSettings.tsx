import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AiProvider, Settings } from "@/lib/types";

interface AiProviderSettingsProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

interface ProviderOption {
  id: AiProvider;
  label: string;
  description: string;
}

const PROVIDERS: ProviderOption[] = [
  { id: "claude-code", label: "Claude Code", description: "Anthropic's CLI agent." },
  { id: "codex", label: "Codex", description: "OpenAI's CLI agent." },
];

export function AiProviderSettings({ settings, onChange }: AiProviderSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI provider</CardTitle>
        <CardDescription>Used to launch a coding session for a project.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {PROVIDERS.map((provider) => {
          const active = settings.aiProvider === provider.id;
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => onChange({ aiProvider: provider.id })}
              className={cn(
                "flex flex-col items-start gap-1 rounded-md border px-3 py-3 text-left transition-colors duration-150 ease-out",
                active ? "border-foreground/40 bg-secondary" : "border-border hover:bg-secondary/40",
              )}
            >
              <span className="text-sm font-medium text-foreground">{provider.label}</span>
              <span className="text-xs text-muted-foreground">{provider.description}</span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
