import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Settings } from "@/lib/types";

interface RunSettingsProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

export function RunSettings({ settings, onChange }: RunSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Run behavior</CardTitle>
        <CardDescription>Screenshot capture and batch concurrency.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-screenshot">Auto-screenshot on run</Label>
            <p className="text-xs text-muted-foreground">Capture desktop + mobile after a successful run.</p>
          </div>
          <Switch
            id="auto-screenshot"
            checked={settings.autoScreenshot}
            onCheckedChange={(checked) => onChange({ autoScreenshot: checked })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="concurrent-runs">Concurrent runs</Label>
            <p className="text-xs text-muted-foreground">Projects processed at once during a batch refresh.</p>
          </div>
          <Input
            id="concurrent-runs"
            type="number"
            min={1}
            max={8}
            value={settings.concurrentRuns}
            onChange={(event) => onChange({ concurrentRuns: Number(event.target.value) || 1 })}
            className="w-16 text-center"
          />
        </div>
      </CardContent>
    </Card>
  );
}
