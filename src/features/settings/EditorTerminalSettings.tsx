import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Settings } from "@/lib/types";

interface EditorTerminalSettingsProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

const EDITORS: { id: Settings["editor"]; label: string }[] = [
  { id: "vscode", label: "VS Code" },
  { id: "cursor", label: "Cursor" },
  { id: "zed", label: "Zed" },
  { id: "webstorm", label: "WebStorm" },
];

const TERMINALS: { id: Settings["terminal"]; label: string }[] = [
  { id: "terminal", label: "Terminal" },
  { id: "iterm", label: "iTerm2" },
  { id: "warp", label: "Warp" },
  { id: "ghostty", label: "Ghostty" },
];

export function EditorTerminalSettings({ settings, onChange }: EditorTerminalSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tooling</CardTitle>
        <CardDescription>Where "Open Code" and "Open Terminal" send you.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Editor</Label>
          <Select
            value={settings.editor}
            onValueChange={(value) => onChange({ editor: value as Settings["editor"] })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EDITORS.map((editor) => (
                <SelectItem key={editor.id} value={editor.id}>
                  {editor.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Terminal</Label>
          <Select
            value={settings.terminal}
            onValueChange={(value) => onChange({ terminal: value as Settings["terminal"] })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TERMINALS.map((terminal) => (
                <SelectItem key={terminal.id} value={terminal.id}>
                  {terminal.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
