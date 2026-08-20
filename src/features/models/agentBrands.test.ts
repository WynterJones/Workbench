import { describe, expect, it } from "vitest";
import { agentBrand, agentInitial, knownAgentIds, LETTER_FALLBACK } from "@/features/models/agentBrands";

const SHIPPED_AGENTS = [
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

describe("agent brands", () => {
  it("every shipped agent resolves to a real mark or an explicit fallback", () => {
    const unhandled = SHIPPED_AGENTS.filter(
      (id) => agentBrand(id) === null && !(id in LETTER_FALLBACK),
    );
    expect(unhandled).toEqual([]);
  });

  it("never returns an empty mark for an agent it claims to have an icon for", () => {
    for (const id of knownAgentIds()) {
      const brand = agentBrand(id);
      if (brand) {
        expect(brand.path.length).toBeGreaterThan(10);
        expect(brand.hex).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("falls back to a vendor initial rather than a blank tile", () => {
    expect(agentInitial("codex", "OpenAI")).toBe("O");
    expect(agentInitial("crush", "Charm")).toBe("C");
    expect(agentInitial("unknown-agent", "Acme")).toBe("A");
    expect(agentInitial("unknown-agent", "")).toBe("U");
  });

  it("returns null for an agent with no mapping instead of throwing", () => {
    expect(agentBrand("not-a-real-agent")).toBeNull();
  });
});
