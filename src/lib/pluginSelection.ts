export interface Selection {
  source: string;
  authors: string[];
}

export function parseSelection(entry: string): Selection {
  const [source, authors = ""] = entry.split("#");
  return {
    source,
    authors: authors
      .split(",")
      .map((author) => author.trim())
      .filter(Boolean),
  };
}

export function formatSelection({ source, authors }: Selection): string {
  return authors.length === 0 ? source : `${source}#${authors.join(",")}`;
}

export function selectedSources(selected: string[]): string[] {
  return selected.map((entry) => parseSelection(entry).source);
}

export function authorsFor(selected: string[], source: string): string[] {
  return selected.map(parseSelection).find((s) => s.source === source)?.authors ?? [];
}

export function toggleSource(selected: string[], source: string): string[] {
  return selectedSources(selected).includes(source)
    ? selected.filter((entry) => parseSelection(entry).source !== source)
    : [...selected, source];
}

export function toggleAuthor(selected: string[], source: string, author: string): string[] {
  const current = authorsFor(selected, source);
  const authors = current.includes(author)
    ? current.filter((entry) => entry !== author)
    : [...current, author];
  const next = formatSelection({ source, authors });

  return selectedSources(selected).includes(source)
    ? selected.map((entry) => (parseSelection(entry).source === source ? next : entry))
    : [...selected, next];
}
