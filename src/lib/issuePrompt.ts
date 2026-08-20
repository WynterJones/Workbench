import type { PluginItem, PluginItemDetail } from "@/hooks/usePluginData";

export function issuePrompt(item: PluginItem, detail: PluginItemDetail | undefined): string {
  const lines = [
    `Fix this production error reported by Sentry in ${item.source}.`,
    "",
    `Error: ${detail?.summary ?? item.title}`,
  ];

  if (item.subtitle) lines.push(`Culprit: ${item.subtitle}`);
  if (detail?.request) lines.push(`Request: ${detail.request}`);
  if (item.meta) lines.push(`Volume: ${item.meta}`);
  if (detail?.occurred) lines.push(`Last event: ${detail.occurred}`);
  if (detail?.tags.length) lines.push(`Tags: ${detail.tags.join(", ")}`);

  if (detail?.frames.length) {
    lines.push("", "Stack (most recent frame first):");
    detail.frames.forEach((frame) => lines.push(`  ${frame}`));
  }

  if (item.url) lines.push("", `Sentry: ${item.url}`);
  lines.push(
    "",
    "Find the root cause in this repo, explain what triggers it, and propose the smallest fix.",
  );

  return lines.join("\n");
}
