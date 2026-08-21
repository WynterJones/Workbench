import { useQuery } from "@tanstack/react-query";
import { useAppVersion } from "@/hooks/useAppVersion";
import { isNewerVersion } from "@/lib/update";

const RELEASE_API = "https://api.github.com/repos/WynterJones/Workbench/releases/latest";

async function latestVersion() {
  const response = await fetch(RELEASE_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) return null;

  const release: unknown = await response.json();
  if (!release || typeof release !== "object" || !("tag_name" in release)) return null;
  return typeof release.tag_name === "string" ? release.tag_name.replace(/^v/, "") : null;
}

export function useUpdateAvailable() {
  const currentVersion = useAppVersion();

  return useQuery({
    queryKey: ["app-update", currentVersion],
    queryFn: async () => {
      const latest = await latestVersion();
      return latest && currentVersion && isNewerVersion(latest, currentVersion) ? latest : null;
    },
    enabled: currentVersion !== null,
    staleTime: Infinity,
    retry: false,
  });
}
