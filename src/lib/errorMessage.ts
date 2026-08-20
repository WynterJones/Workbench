interface Explained {
  title: string;
  message: string;
  hint?: string;
}

const PATTERNS: { match: RegExp; explain: (raw: string) => Explained }[] = [
  {
    match: /outside the .*skill directories/i,
    explain: (raw) => ({
      title: "That skill lives outside the allowed folders",
      message: raw,
      hint: "Workbench only reads skills under ~/.claude, ~/.codex and ~/.agents.",
    }),
  },
  {
    match: /not a git repository/i,
    explain: () => ({
      title: "No git history here",
      message: "This project isn't a git repository, so there are no commits to show.",
    }),
  },
  {
    match: /not trusted/i,
    explain: () => ({
      title: "This project isn't trusted yet",
      message: "Workbench never runs project code until you approve the exact command.",
      hint: "Press Run and confirm the command to trust it.",
    }),
  },
  {
    match: /no scan roots configured/i,
    explain: (raw) => ({
      title: "No folders to scan",
      message: raw,
      hint: "Add a folder in Settings, then scan again.",
    }),
  },
  {
    match: /could not run npx|command not found|ENOENT/i,
    explain: (raw) => ({
      title: "A required command is missing",
      message: raw,
      hint: "Check that Node and npx are installed and on your PATH.",
    }),
  },
  {
    match: /path does not exist/i,
    explain: (raw) => ({
      title: "That path is gone",
      message: raw,
      hint: "It may have been moved or deleted since the last scan.",
    }),
  },
  {
    match: /permission denied|EACCES/i,
    explain: (raw) => ({
      title: "Permission denied",
      message: raw,
      hint: "macOS may need to grant Workbench access to this folder.",
    }),
  },
];

export function explainError(error: unknown): Explained {
  const raw =
    error instanceof Error ? error.message : typeof error === "string" ? error : String(error ?? "");
  const trimmed = raw.trim() || "An unexpected error occurred.";

  const matched = PATTERNS.find((pattern) => pattern.match.test(trimmed));
  if (matched) return matched.explain(trimmed);

  return { title: "Something went wrong", message: trimmed };
}
