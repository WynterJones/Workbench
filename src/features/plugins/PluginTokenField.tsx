import { useState } from "react";
import { CheckIcon, ExternalLinkIcon, KeyRoundIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { openUrl } from "@/lib/openUrl";
import { useSetPluginCredential } from "@/hooks/usePlugins";
import type { PluginMeta } from "@/lib/pluginCatalog";

interface PluginTokenFieldProps {
  meta: PluginMeta;
  hasCredential: boolean;
}

export function PluginTokenField({ meta, hasCredential }: PluginTokenFieldProps) {
  const [token, setToken] = useState("");
  const save = useSetPluginCredential();

  function submit() {
    const trimmed = token.trim();
    if (!trimmed) return;
    save.mutate({ id: meta.id, token: trimmed }, { onSuccess: () => setToken("") });
  }

  if (hasCredential) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckIcon className="size-3.5 text-emerald-400" />
          {meta.tokenLabel} stored in your macOS Keychain
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="cursor-pointer gap-1.5 text-muted-foreground hover:text-destructive"
          onClick={() => save.mutate({ id: meta.id, token: "" })}
          disabled={save.isPending}
        >
          <Trash2Icon className="size-3.5" />
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={`token-${meta.id}`} className="flex items-center gap-1.5">
          <KeyRoundIcon className="size-3.5 text-muted-foreground" />
          {meta.tokenLabel}
        </Label>
        <button
          type="button"
          onClick={() => openUrl(meta.tokenUrl)}
          className="flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Get a token
          <ExternalLinkIcon className="size-3" />
        </button>
      </div>
      <div className="flex gap-2">
        <Input
          id={`token-${meta.id}`}
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={token}
          placeholder="Paste your token"
          onChange={(event) => setToken(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submit()}
        />
        <Button
          onClick={submit}
          disabled={!token.trim() || save.isPending}
          className="shrink-0 cursor-pointer"
        >
          Save
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground/70">{meta.tokenHint}</p>
    </div>
  );
}
