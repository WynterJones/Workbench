import { describe, expect, it } from "vitest";
import { AGENT_MARKS } from "@/features/models/agentMarks";
import { agentInitial } from "@/features/models/agentBrands";

const SHIPPED = [
  "claude-code",
  "codex",
  "gemini-cli",
  "cursor-agent",
  "copilot-cli",
  "opencode",
  "crush",
  "aider",
  "amp",
  "qwen-code",
  "goose",
  "cline",
  "openclaw",
  "hermes",
  "pi",
  "ollama",
];

const WITHOUT_A_PUBLISHED_MARK = ["aider"];

describe("agent marks", () => {
  it("has a real mark for every agent that has one published", () => {
    const missing = SHIPPED.filter(
      (id) => !AGENT_MARKS[id] && !WITHOUT_A_PUBLISHED_MARK.includes(id),
    );
    expect(missing).toEqual([]);
  });

  it("every mark carries either drawable svg or an inline image", () => {
    for (const [id, mark] of Object.entries(AGENT_MARKS)) {
      if (mark.image) {
        expect(mark.image, `${id} image`).toMatch(/^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/);
        continue;
      }
      expect(mark.viewBox, `${id} viewBox`).toMatch(/^[\d.\s-]+$/);
      expect(mark.svg!.length, `${id} svg length`).toBeGreaterThan(40);
      expect(mark.svg, `${id} svg`).toMatch(/<(path|circle|rect|g|polygon|ellipse)/);
    }
  });

  it("no mark carries a script or event handler", () => {
    for (const [id, mark] of Object.entries(AGENT_MARKS)) {
      expect(mark.svg ?? "", `${id}`).not.toMatch(/<script|on[a-z]+=/i);
    }
  });

  it("agents without a published mark still render a readable initial", () => {
    for (const id of WITHOUT_A_PUBLISHED_MARK) {
      expect(AGENT_MARKS[id]).toBeUndefined();
      expect(agentInitial(id, "Vendor")).toMatch(/^[A-Z]$/);
    }
  });
});
