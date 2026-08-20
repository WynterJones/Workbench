import { describe, expect, it } from "vitest";
import { tokenize } from "@/lib/highlight";

function kinds(line: string) {
  return tokenize(line).map((t) => t.kind);
}

function joined(line: string) {
  return tokenize(line)
    .map((t) => t.text)
    .join("");
}

describe("tokenize", () => {
  it("never loses or reorders characters", () => {
    const samples = [
      'const a = "hello"; // note',
      "fn main() { let x = 42; }",
      "def run(self): return None",
      "",
      "   ",
    ];
    for (const sample of samples) {
      expect(joined(sample)).toBe(sample);
    }
  });

  it("marks keywords, strings, numbers and comments", () => {
    const tokens = tokenize('const x = "hi" + 42; // done');
    const byKind = (kind: string) => tokens.filter((t) => t.kind === kind).map((t) => t.text);
    expect(byKind("keyword")).toContain("const");
    expect(byKind("string")).toContain('"hi"');
    expect(byKind("number")).toContain("42");
    expect(byKind("comment")).toContain("// done");
  });

  it("treats a hash comment as a comment", () => {
    expect(kinds("# python comment")).toEqual(["comment"]);
  });

  it("does not treat identifiers containing keywords as keywords", () => {
    const tokens = tokenize("constant = 1");
    expect(tokens.find((t) => t.text === "constant")!.kind).toBe("plain");
  });

  it("handles an escaped quote inside a string", () => {
    const tokens = tokenize('const s = "a\\"b";');
    expect(tokens.some((t) => t.kind === "string" && t.text === '"a\\"b"')).toBe(true);
  });
});
