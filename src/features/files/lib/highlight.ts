const KEYWORDS: Record<string, string[]> = {
  ts: ["import", "export", "from", "const", "let", "var", "function", "return", "interface", "type", "class", "extends", "implements", "if", "else", "for", "while", "switch", "case", "break", "continue", "new", "this", "async", "await", "try", "catch", "throw", "public", "private", "readonly", "enum", "default", "as", "in", "of", "typeof", "void", "null", "undefined", "true", "false"],
  rs: ["fn", "let", "mut", "pub", "struct", "enum", "impl", "trait", "use", "mod", "match", "if", "else", "for", "while", "loop", "return", "self", "Self", "async", "await", "where", "as", "true", "false", "const", "static"],
  py: ["def", "class", "import", "from", "return", "if", "elif", "else", "for", "while", "try", "except", "finally", "with", "as", "pass", "break", "continue", "lambda", "yield", "async", "await", "None", "True", "False", "self"],
  go: ["func", "package", "import", "var", "const", "type", "struct", "interface", "return", "if", "else", "for", "range", "switch", "case", "break", "continue", "go", "defer", "chan", "map", "nil", "true", "false"],
};

function keywordsFor(lang: string): string[] {
  if (lang === "js" || lang === "jsx" || lang === "tsx" || lang === "mjs" || lang === "cjs") return KEYWORDS.ts;
  return KEYWORDS[lang] ?? KEYWORDS.ts;
}

export function languageForExtension(ext: string | null): string {
  return (ext ?? "").toLowerCase();
}

export interface HighlightToken {
  text: string;
  tone: "keyword" | "string" | "comment" | "number" | "plain";
}

const STRING_RE = /^("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`)/;
const NUMBER_RE = /^\d+(\.\d+)?/;
const WORD_RE = /^[A-Za-z_][A-Za-z0-9_]*/;
const COMMENT_LINE_RE = /^(\/\/|#).*/;

export function highlightLine(line: string, lang: string): HighlightToken[] {
  const keywords = new Set(keywordsFor(lang));
  const tokens: HighlightToken[] = [];
  let rest = line;

  const commentMatch = COMMENT_LINE_RE.exec(rest);
  if (commentMatch) {
    return [{ text: line, tone: "comment" }];
  }

  while (rest.length > 0) {
    const stringMatch = STRING_RE.exec(rest);
    if (stringMatch) {
      tokens.push({ text: stringMatch[0], tone: "string" });
      rest = rest.slice(stringMatch[0].length);
      continue;
    }
    const numberMatch = NUMBER_RE.exec(rest);
    if (numberMatch) {
      tokens.push({ text: numberMatch[0], tone: "number" });
      rest = rest.slice(numberMatch[0].length);
      continue;
    }
    const wordMatch = WORD_RE.exec(rest);
    if (wordMatch) {
      const tone = keywords.has(wordMatch[0]) ? "keyword" : "plain";
      tokens.push({ text: wordMatch[0], tone });
      rest = rest.slice(wordMatch[0].length);
      continue;
    }
    tokens.push({ text: rest[0], tone: "plain" });
    rest = rest.slice(1);
  }

  return tokens;
}
