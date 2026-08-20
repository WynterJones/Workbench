import type { Framework } from "@/lib/types";

export interface ManualRun {
  title: string;
  detail: string;
  steps: string[];
}

const MANUAL: Partial<Record<Framework, ManualRun>> = {
  "chrome-extension": {
    title: "Chrome extensions are loaded, not served",
    detail: "There is no dev server to start — Chrome runs this one for you.",
    steps: [
      "Open chrome://extensions in Chrome",
      "Turn on Developer mode, top right",
      "Click 'Load unpacked' and pick this folder",
      "Reload the extension there after each change",
    ],
  },
  godot: {
    title: "Godot projects open in the editor",
    detail: "Workbench can't start a Godot game headlessly.",
    steps: [
      "Open the Godot editor",
      "Import this folder as a project",
      "Press F5 to play it",
    ],
  },
  tauri: {
    title: "Tauri apps open a desktop window",
    detail: "This builds a native window rather than a URL Workbench can screenshot.",
    steps: [
      "Run the dev command in a terminal (usually npm run tauri dev)",
      "The app opens as a desktop window, not in the browser",
    ],
  },
  wordpress: {
    title: "WordPress needs a PHP host",
    detail: "This is theme or plugin code, not a standalone server.",
    steps: [
      "Start a local WordPress (Local, MAMP, wp-env, or Docker)",
      "Symlink or copy this folder into wp-content",
      "Activate it from the WordPress admin",
    ],
  },
};

export function manualRun(framework: Framework): ManualRun | null {
  return MANUAL[framework] ?? null;
}
