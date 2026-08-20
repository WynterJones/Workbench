import { useCallback, useEffect, useRef } from "react";
import { clampRect, type Rect } from "@/lib/terminalStore";

export type Handle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface Gesture {
  handle: Handle;
  startX: number;
  startY: number;
  origin: Rect;
}

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

export function applyGesture(gesture: Gesture, clientX: number, clientY: number): Rect {
  const dx = clientX - gesture.startX;
  const dy = clientY - gesture.startY;
  const { x, y, width, height } = gesture.origin;

  if (gesture.handle === "move") {
    return { x: x + dx, y: y + dy, width, height };
  }

  let next: Rect = { x, y, width, height };

  if (gesture.handle.includes("e")) next = { ...next, width: width + dx };
  if (gesture.handle.includes("s")) next = { ...next, height: height + dy };
  if (gesture.handle.includes("w")) next = { ...next, x: x + dx, width: width - dx };
  if (gesture.handle.includes("n")) next = { ...next, y: y + dy, height: height - dy };

  return next;
}

export function useDragResize(rect: Rect, onChange: (rect: Rect) => void) {
  const gesture = useRef<Gesture | null>(null);

  const start = useCallback(
    (handle: Handle, event: React.PointerEvent) => {
      event.preventDefault();
      gesture.current = {
        handle,
        startX: event.clientX,
        startY: event.clientY,
        origin: rect,
      };
      document.body.style.userSelect = "none";
    },
    [rect],
  );

  useEffect(() => {
    function onMove(event: PointerEvent) {
      if (!gesture.current) return;
      onChange(clampRect(applyGesture(gesture.current, event.clientX, event.clientY), viewport()));
    }
    function onUp() {
      if (!gesture.current) return;
      gesture.current = null;
      document.body.style.userSelect = "";
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [onChange]);

  useEffect(() => {
    function onResize() {
      onChange(clampRect(rect, viewport()));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [rect, onChange]);

  return { start };
}
