import { useState } from "react";
import { ArrowUpCircle } from "lucide-react";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUpdateAvailable } from "@/hooks/useUpdateAvailable";

export function UpdateAvailableButton({ collapsed = false }: { collapsed?: boolean }) {
  const { data: update } = useUpdateAvailable();
  const [installing, setInstalling] = useState(false);
  if (!update) return null;

  async function install() {
    if (!update) return;
    setInstalling(true);
    try {
      await update.downloadAndInstall();
      await relaunch();
    } catch (error) {
      setInstalling(false);
      toast.error("Update failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Button
      type="button"
      onClick={install}
      disabled={installing}
      title={collapsed ? `Update to v${update.version}` : undefined}
      className={collapsed ? "w-full bg-brand px-0 text-background hover:bg-brand/90" : "w-full justify-start bg-brand text-background hover:bg-brand/90"}
    >
      <ArrowUpCircle />
      <span className={collapsed ? "sr-only" : "flex-1 text-left"}>
        {installing ? "Updating…" : "Update available"}
      </span>
      {!collapsed && <span className="font-mono text-[11px]">v{update.version}</span>}
    </Button>
  );
}
