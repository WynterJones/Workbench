import { createElement, type ReactNode } from "react";

function inline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`(.+?)`/g, "$1");
}

export function renderMarkdownLite(source: string): ReactNode[] {
  const lines = source.split("\n");
  const nodes: ReactNode[] = [];
  let listBuffer: string[] = [];

  function flushList() {
    if (listBuffer.length === 0) return;
    nodes.push(
      createElement(
        "ul",
        { key: `ul-${nodes.length}`, className: "list-disc space-y-1 pl-5 text-sm text-foreground/80" },
        listBuffer.map((item, i) => createElement("li", { key: i }, inline(item)))
      )
    );
    listBuffer = [];
  }

  lines.forEach((line, index) => {
    const heading = /^(#{1,6})\s+(.*)/.exec(line);
    const listItem = /^[-*]\s+(.*)/.exec(line);

    if (heading) {
      flushList();
      const level = heading[1].length;
      const size = level === 1 ? "text-lg" : level === 2 ? "text-base" : "text-sm";
      nodes.push(
        createElement(
          "div",
          { key: index, className: `${size} font-semibold text-foreground mt-3 first:mt-0` },
          inline(heading[2])
        )
      );
      return;
    }
    if (listItem) {
      listBuffer.push(listItem[1]);
      return;
    }
    flushList();
    if (line.trim().length === 0) return;
    nodes.push(
      createElement("p", { key: index, className: "text-sm leading-relaxed text-foreground/80" }, inline(line))
    );
  });
  flushList();

  return nodes;
}
