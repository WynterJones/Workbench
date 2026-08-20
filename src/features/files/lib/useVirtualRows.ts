import { useState, type RefObject } from "react";

interface VirtualRowsResult {
  startIndex: number;
  endIndex: number;
  offsetY: number;
  totalHeight: number;
  onScroll: () => void;
}

export function useVirtualRows(
  containerRef: RefObject<HTMLDivElement | null>,
  count: number,
  rowHeight: number,
  overscan = 8
): VirtualRowsResult {
  const [scrollTop, setScrollTop] = useState(0);
  const viewportHeight = containerRef.current?.clientHeight ?? 600;

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const endIndex = Math.min(count, startIndex + visibleCount);

  return {
    startIndex,
    endIndex,
    offsetY: startIndex * rowHeight,
    totalHeight: count * rowHeight,
    onScroll: () => setScrollTop(containerRef.current?.scrollTop ?? 0),
  };
}
