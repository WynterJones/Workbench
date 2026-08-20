interface ReadmePanelProps {
  readmeSummary: string | null;
}

export function ReadmePanel({ readmeSummary }: ReadmePanelProps) {
  if (!readmeSummary) {
    return <p className="text-sm text-muted-foreground">No README found.</p>;
  }

  const paragraphs = readmeSummary.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="prose-invert max-w-none space-y-3 text-sm leading-relaxed text-foreground/90">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
