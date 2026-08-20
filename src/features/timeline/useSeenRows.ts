import { useEffect, useState } from "react";

export function useSeenRows(container: React.RefObject<HTMLElement | null>, deps: unknown) {
  const [seen, setSeen] = useState<Set<string>>(new Set());

  useEffect(() => {
    const root = container.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const arrived: string[] = [];
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.getAttribute("data-row-id");
          if (id) arrived.push(id);
        }
        if (arrived.length > 0) {
          setSeen((current) => {
            const next = new Set(current);
            arrived.forEach((id) => next.add(id));
            return next;
          });
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );

    root.querySelectorAll("[data-row-id]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [container, deps]);

  return seen;
}
