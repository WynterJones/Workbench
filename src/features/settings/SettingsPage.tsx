import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScanRootsSettings } from "@/features/settings/ScanRootsSettings";
import { AiProviderSettings } from "@/features/settings/AiProviderSettings";
import { EditorTerminalSettings } from "@/features/settings/EditorTerminalSettings";
import { RunSettings } from "@/features/settings/RunSettings";
import { useSaveSettings, useSettings } from "@/hooks/useSettings";
import { useAppStore } from "@/lib/store";
import type { Settings } from "@/lib/types";

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const saveSettings = useSaveSettings();
  const setRoute = useAppStore((s) => s.setRoute);

  function updateSettings(patch: Partial<Settings>) {
    if (!settings) return;
    saveSettings.mutate({ ...settings, ...patch });
  }

  if (isLoading || !settings) {
    return <div className="p-8 text-sm text-muted-foreground">Loading settings…</div>;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Scan roots, tooling, and run behavior.</p>
        </div>
        <Button variant="outline" onClick={() => setRoute("intro")} className="gap-2">
          <RotateCcw className="size-4" />
          Replay intro
        </Button>
      </div>
      <ScanRootsSettings />
      <AiProviderSettings settings={settings} onChange={updateSettings} />
      <EditorTerminalSettings settings={settings} onChange={updateSettings} />
      <RunSettings settings={settings} onChange={updateSettings} />
    </div>
  );
}
