import { brandByName } from "@/lib/brandIcons";
import type { BrandMark } from "@/lib/brandIcons";

const ICON_KEYS: Record<string, string> = {
  "claude-code": "anthropic",
  "gemini-cli": "googlegemini",
  "cursor-agent": "cursor",
  "copilot-cli": "githubcopilot",
  opencode: "opencode",
  cline: "cline",
  ollama: "ollama",
};

export const LETTER_FALLBACK: Record<string, string> = {
  codex: "OpenAI",
  crush: "Charm",
  aider: "Aider",
  amp: "Sourcegraph",
  "qwen-code": "Qwen",
  goose: "Block",
  openclaw: "OpenClaw",
  hermes: "Hermes",
  pi: "Pi",
};

export function agentBrand(agentId: string): BrandMark | null {
  const key = ICON_KEYS[agentId];
  return key ? brandByName(key) : null;
}

export function agentInitial(agentId: string, vendor: string): string {
  const candidates = [LETTER_FALLBACK[agentId], vendor, agentId];
  const source = candidates.find((value) => value && value.trim().length > 0) ?? "?";
  return source.trim().charAt(0).toUpperCase();
}

export function knownAgentIds(): string[] {
  return [...Object.keys(ICON_KEYS), ...Object.keys(LETTER_FALLBACK)];
}
