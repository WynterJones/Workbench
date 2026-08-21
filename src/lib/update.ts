export const LATEST_RELEASE_URL = "https://github.com/WynterJones/Workbench/releases/latest";

function versionParts(version: string) {
  const match = version.trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  return match?.slice(1).map(Number) ?? null;
}

export function isNewerVersion(latest: string, current: string) {
  const latestParts = versionParts(latest);
  const currentParts = versionParts(current);
  if (!latestParts || !currentParts) return false;

  return latestParts.some(
    (part, index) =>
      part > currentParts[index] &&
      latestParts.slice(0, index).every((value, previous) => value === currentParts[previous]),
  );
}
