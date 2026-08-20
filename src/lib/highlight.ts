export type TokenKind = "keyword" | "string" | "comment" | "number" | "plain";

export interface Token {
  text: string;
  kind: TokenKind;
}

const KEYWORDS = new Set([
  "import", "from", "export", "default", "const", "let", "var", "function", "return", "if", "else",
  "for", "while", "class", "extends", "new", "async", "await", "try", "catch", "throw", "typeof",
  "interface", "type", "enum", "public", "private", "static", "fn", "pub", "use", "mod", "struct",
  "impl", "match", "loop", "package", "func", "defer", "go", "def", "elif", "lambda", "end", "do",
  "module", "require", "self", "this", "null", "true", "false", "nil", "None", "True", "False",
]);

const PATTERN =
  /(\/\/[^\n]*|#[^\n]*|--[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;

export function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  for (const match of line.matchAll(PATTERN)) {
    const start = match.index ?? 0;
    if (start > index) tokens.push({ text: line.slice(index, start), kind: "plain" });

    const [full, comment, str, num, word] = match;
    if (comment) tokens.push({ text: full, kind: "comment" });
    else if (str) tokens.push({ text: full, kind: "string" });
    else if (num) tokens.push({ text: full, kind: "number" });
    else if (word && KEYWORDS.has(word)) tokens.push({ text: full, kind: "keyword" });
    else tokens.push({ text: full, kind: "plain" });

    index = start + full.length;
  }

  if (index < line.length) tokens.push({ text: line.slice(index), kind: "plain" });
  return tokens;
}
