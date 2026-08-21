import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { IntroScreen } from "@/features/intro/IntroScreen";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { LibraryPage } from "@/features/library/LibraryPage";
import { ProjectPage } from "@/features/project/ProjectPage";
import { FilesPage } from "@/features/files/FilesPage";
import { SkillsPage } from "@/features/skills/SkillsPage";
import { TimelinePage } from "@/features/timeline/TimelinePage";
import { MediaPage } from "@/features/media/MediaPage";
import { StarterLibrary } from "@/features/files/StarterLibrary";
import { ModelsPage } from "@/features/models/ModelsPage";
import { McpPage } from "@/features/mcp/McpPage";
import { PluginsPage } from "@/features/plugins/PluginsPage";
import { PluginDashboard } from "@/features/plugins/PluginDashboard";
import { useFilesStore } from "@/lib/filesStore";
import { WindowSweep } from "@/components/WindowSweep";
import { TerminalPanel } from "@/features/terminal/TerminalPanel";
import { useAppStore } from "@/lib/store";
import { useSettings } from "@/hooks/useSettings";

export default function App() {
  const route = useAppStore((s) => s.route);
  const setRoute = useAppStore((s) => s.setRoute);
  const filesPath = useAppStore((s) => s.filesPath);
  const { data: settings, isLoading } = useSettings();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || !settings) return;
    if (settings.introSeen) {
      setRoute("library");
    }
    setInitialized(true);
  }, [settings, initialized, setRoute]);

  useEffect(() => {
    if (route !== "files" || !filesPath) return;
    useFilesStore.getState().setMode("browse");
    useFilesStore.getState().setRoot(filesPath);
  }, [route, filesPath]);

  if (isLoading) {
    return <div className="h-screen w-screen bg-background" />;
  }

  if (route === "intro") {
    return (
      <>
        <IntroScreen />
        <WindowSweep />
      </>
    );
  }

  return (
    <AppShell>
      {route === "library" && <LibraryPage />}
      {route === "project" && <ProjectPage />}
      {route === "timeline" && <TimelinePage />}
      {route === "media" && <MediaPage />}
      {route === "starters" && <StarterLibrary />}
      {route === "files" && <FilesPage />}
      {route === "skills" && <SkillsPage />}
      {route === "models" && <ModelsPage />}
      {route === "mcp" && <McpPage />}
      {route === "plugins" && <PluginsPage />}
      {route === "plugin" && <PluginDashboard />}
      {route === "settings" && <SettingsPage />}
      <TerminalPanel />
    </AppShell>
  );
}
