import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { IntroScreen } from "@/features/intro/IntroScreen";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { LibraryPage } from "@/features/library/LibraryPage";
import { ProjectPage } from "@/features/project/ProjectPage";
import { FilesPage } from "@/features/files/FilesPage";
import { useFilesStore } from "@/lib/filesStore";
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
    if (filesPath) useFilesStore.getState().setRoot(filesPath);
  }, [filesPath]);

  if (isLoading) {
    return <div className="h-screen w-screen bg-background" />;
  }

  if (route === "intro") {
    return <IntroScreen />;
  }

  return (
    <AppShell>
      {route === "library" && <LibraryPage />}
      {route === "project" && <ProjectPage />}
      {route === "files" && <FilesPage />}
      {route === "settings" && <SettingsPage />}
    </AppShell>
  );
}
