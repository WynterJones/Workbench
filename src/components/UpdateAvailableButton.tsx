import { ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdateAvailable } from "@/hooks/useUpdateAvailable";
import { LATEST_RELEASE_URL } from "@/lib/update";
import { openUrl } from "@/lib/openUrl";

export function UpdateAvailableButton() {
  const { data: version } = useUpdateAvailable();
  if (!version) return null;

  return (
    <Button
      type="button"
      onClick={() => openUrl(LATEST_RELEASE_URL)}
      className="w-full justify-start bg-brand text-background hover:bg-brand/90"
    >
      <ArrowUpCircle />
      <span className="flex-1 text-left">Update available</span>
      <span className="font-mono text-[11px]">v{version}</span>
    </Button>
  );
}
