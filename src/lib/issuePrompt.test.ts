import { describe, expect, it } from "vitest";
import { issuePrompt } from "@/lib/issuePrompt";
import type { PluginItem, PluginItemDetail } from "@/hooks/usePluginData";

const item: PluginItem = {
  id: "sentry:99",
  source: "acme/web",
  sourceId: "acme/web",
  title: "TypeError: null is not an object",
  subtitle: "app/routes/checkout",
  status: "error",
  tone: "bad",
  url: "https://sentry.io/organizations/acme/issues/99/",
  timestamp: "2026-08-20T10:00:00Z",
  meta: "1.5k events",
};

const detail: PluginItemDetail = {
  summary: "TypeError: null is not an object (evaluating 'document.body')",
  frames: ["app/checkout.ts in submit at line 9", "app/cart.ts in total at line 42"],
  request: "POST https://acme.dev/checkout",
  tags: ["browser=Chrome 138"],
  occurred: "2026-08-20T10:00:00Z",
};

describe("issuePrompt", () => {
  it("leads with the detailed summary and keeps every frame", () => {
    const prompt = issuePrompt(item, detail);
    expect(prompt).toContain(`Error: ${detail.summary}`);
    expect(prompt).toContain("acme/web");
    expect(prompt).toContain("POST https://acme.dev/checkout");
    for (const frame of detail.frames) expect(prompt).toContain(frame);
    expect(prompt.indexOf(detail.frames[0])).toBeLessThan(prompt.indexOf(detail.frames[1]));
  });

  it("falls back to the list title when the detail has not loaded", () => {
    const prompt = issuePrompt(item, undefined);
    expect(prompt).toContain(`Error: ${item.title}`);
    expect(prompt).toContain(item.url!);
    expect(prompt).not.toContain("Stack");
  });

  it("skips fields the issue does not carry", () => {
    const bare: PluginItem = { ...item, subtitle: "", meta: null, url: null };
    const prompt = issuePrompt(bare, { ...detail, request: null, tags: [], frames: [] });
    expect(prompt).not.toContain("Culprit:");
    expect(prompt).not.toContain("Volume:");
    expect(prompt).not.toContain("Sentry:");
    expect(prompt).not.toContain("Tags:");
  });
});
