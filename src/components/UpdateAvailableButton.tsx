import { ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdateAvailable } from "@/hooks/useUpdateAvailable";
import { LATEST_RELEASE_URL } from "@/lib/update";
import { openUrl } from "@/lib/openUrl";

export function UpdateAvailableButton({ collapsed = false }: { collapsed?: boolean }) {
  const { data: version } = useUpdateAvailable();
  if (!version) return null;

  return (
    <Button
      type="button"
      onClick={() => openUrl(LATEST_RELEASE_URL)}
      title={collapsed ? `Update to v${version}` : undefined}
      className={collapsed ? "w-full bg-brand px-0 text-background hover:bg-brand/90" : "w-full justify-start bg-brand text-background hover:bg-brand/90"}
    >
      <ArrowUpCircle />
      <span className={collapsed ? "sr-only" : "flex-1 text-left"}>Update available</span>
      {!collapsed && <span className="font-mono text-[11px]">v{version}</span>}
    </Button>
  );
}
