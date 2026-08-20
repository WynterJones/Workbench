import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const IGNORED_PARAMS = new Set(["app", "state", "window", "webview", "registry", "cancel", "watchers"]);

function walk(dir: string, ext: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry === "target" || entry === "ui") return [];
    if (statSync(full).isDirectory()) return walk(full, ext);
    return full.endsWith(ext) ? [full] : [];
  });
}

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function frontendCalls(): Map<string, Set<string>> {
  const calls = new Map<string, Set<string>>();
  const pattern = /invoke(?:<[^>]*>)?\(\s*"([a-z_0-9]+)"\s*,\s*\{([^}]*)\}/g;
  for (const file of walk(join(ROOT, "src"), ".ts").concat(walk(join(ROOT, "src"), ".tsx"))) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(pattern)) {
      const keys = [...match[2].matchAll(/(?:^|,)\s*(\w+)/g)].map((m) => m[1]);
      const existing = calls.get(match[1]) ?? new Set<string>();
      keys.forEach((k) => existing.add(k));
      calls.set(match[1], existing);
    }
  }
  return calls;
}

interface RustParams {
  required: Set<string>;
  optional: Set<string>;
}

function rustCommands(): Map<string, RustParams> {
  const commands = new Map<string, RustParams>();
  const pattern = /#\[tauri::command[^\]]*\]\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*\(([\s\S]*?)\)\s*->/g;
  for (const file of walk(join(ROOT, "src-tauri", "src"), ".rs")) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(pattern)) {
      const params = new Set<string>();
      let depth = 0;
      let current = "";
      for (const char of match[2]) {
        if (char === "<" || char === "(") depth += 1;
        if (char === ">" || char === ")") depth -= 1;
        if (char === "," && depth === 0) {
          current = "";
          continue;
        }
        current += char;
        if (char === ":" && depth === 0 && current.includes(":")) {
          const name = current.slice(0, -1).trim();
          if (name && !IGNORED_PARAMS.has(name)) params.add(name);
          current = "";
        }
      }
      const required = new Set<string>();
      const optional = new Set<string>();
      for (const piece of match[2].split(/,(?![^<(]*[>)])/)) {
        const trimmed = piece.trim();
        if (!trimmed) continue;
        if (/State<|AppHandle|Window<|WebviewWindow/.test(trimmed)) continue;
        const [name, ...rest] = trimmed.split(":");
        const paramName = name.trim();
        if (!paramName || IGNORED_PARAMS.has(paramName)) continue;
        if (/\bOption\s*</.test(rest.join(":"))) optional.add(paramName);
        else required.add(paramName);
      }
      commands.set(match[1], { required, optional });
    }
  }
  return commands;
}

describe("tauri command contract", () => {
  const frontend = frontendCalls();
  const rust = rustCommands();

  it("finds commands on both sides", () => {
    expect(frontend.size).toBeGreaterThan(10);
    expect(rust.size).toBeGreaterThan(10);
  });

  it("every invoked command exists in Rust", () => {
    const missing = [...frontend.keys()].filter((name) => !rust.has(name));
    expect(missing).toEqual([]);
  });

  it("every invoked command sends all required Rust parameters", () => {
    const missing: string[] = [];
    for (const [name, sent] of frontend) {
      const params = rust.get(name);
      if (!params) continue;
      for (const required of params.required) {
        const camel = snakeToCamel(required);
        if (!sent.has(camel)) {
          missing.push(`${name}: Rust requires "${camel}" but the frontend never sends it`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("no invoked command sends an argument Rust does not accept", () => {
    const unknown: string[] = [];
    for (const [name, sent] of frontend) {
      const params = rust.get(name);
      if (!params) continue;
      const accepted = new Set(
        [...params.required, ...params.optional].map(snakeToCamel),
      );
      for (const key of sent) {
        if (!accepted.has(key)) {
          unknown.push(`${name}: frontend sends "${key}" but Rust has no such parameter`);
        }
      }
    }
    expect(unknown).toEqual([]);
  });
});
