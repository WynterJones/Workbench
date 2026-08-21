export function normalizeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const hasUnsupportedScheme =
    /^[a-z][a-z\d+.-]*:/i.test(trimmed) &&
    !/^https?:/i.test(trimmed) &&
    !/^[^/:]+:\d+(?:\/|$)/.test(trimmed);
  if (hasUnsupportedScheme) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function faviconUrl(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    return new URL("/favicon.ico", value).toString();
  } catch {
    return undefined;
  }
}
