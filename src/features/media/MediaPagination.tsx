import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaPaginationProps {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}

export function MediaPagination({ page, pages, onChange }: MediaPaginationProps) {
  if (pages <= 1) return null;

  return (
    <nav aria-label="Media pages" className="flex items-center justify-center gap-3">
      <Button variant="outline" size="sm" disabled={page === 1} onClick={() => onChange(page - 1)}>
        <ChevronLeftIcon />
        Previous
      </Button>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        Page <span className="text-foreground">{page}</span> of {pages}
      </span>
      <Button variant="outline" size="sm" disabled={page === pages} onClick={() => onChange(page + 1)}>
        Next
        <ChevronRightIcon />
      </Button>
    </nav>
  );
}
