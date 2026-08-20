import { describe, expect, it } from "vitest";
import { explainError } from "@/lib/errorMessage";

describe("explainError", () => {
  it("explains the skill directory guard rejection", () => {
    const result = explainError("path is outside the Claude and Codex skill directories");
    expect(result.title).toMatch(/outside the allowed folders/i);
    expect(result.hint).toContain("~/.agents");
  });

  it("explains an untrusted project", () => {
    const result = explainError(new Error("project is not trusted; call trust_project first"));
    expect(result.title).toMatch(/isn't trusted/i);
    expect(result.hint).toMatch(/confirm the command/i);
  });

  it("explains a missing git repository", () => {
    expect(explainError("not a git repository").title).toMatch(/no git history/i);
  });

  it("falls back to the raw message for unknown errors", () => {
    const result = explainError("kaboom");
    expect(result.title).toBe("Something went wrong");
    expect(result.message).toBe("kaboom");
  });

  it("never returns an empty message", () => {
    expect(explainError(undefined).message.length).toBeGreaterThan(0);
    expect(explainError("").message.length).toBeGreaterThan(0);
  });
});
