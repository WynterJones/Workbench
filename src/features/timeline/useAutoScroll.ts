import { useCallback, useEffect, useRef, useState } from "react";

const BASE_PIXELS_PER_SECOND = 90;

function scrollableAncestor(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null;
  while (current) {
    const style = getComputedStyle(current);
    if (/(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

export function useAutoScroll(anchor: React.RefObject<HTMLElement | null>) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);
  const carry = useRef(0);

  const readProgress = useCallback(() => {
    const container = scrollableAncestor(anchor.current);
    if (!container) return 0;
    const max = container.scrollHeight - container.clientHeight;
    return max <= 0 ? 1 : Math.min(1, container.scrollTop / max);
  }, [anchor]);

  useEffect(() => {
    const container = scrollableAncestor(anchor.current);
    if (!container) return;
    container.classList.toggle("timeline-cinema", playing);
    return () => container.classList.remove("timeline-cinema");
  }, [playing, anchor]);

  useEffect(() => {
    if (!playing) return;

    const container = scrollableAncestor(anchor.current);
    if (!container) return;

    let last = performance.now();
    carry.current = 0;

    function step(now: number) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      const target = scrollableAncestor(anchor.current);
      if (!target) return;

      carry.current += BASE_PIXELS_PER_SECOND * speed * dt;
      const whole = Math.floor(carry.current);
      if (whole > 0) {
        carry.current -= whole;
        target.scrollTop += whole;
      }

      const max = target.scrollHeight - target.clientHeight;
      setProgress(max <= 0 ? 1 : Math.min(1, target.scrollTop / max));

      if (max > 0 && target.scrollTop >= max - 1) {
        setPlaying(false);
        return;
      }

      frame.current = requestAnimationFrame(step);
    }

    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [playing, speed, anchor]);

  const restart = useCallback(() => {
    const container = scrollableAncestor(anchor.current);
    if (container) container.scrollTop = 0;
    setProgress(0);
    setPlaying(true);
  }, [anchor]);

  const toggle = useCallback(() => {
    setPlaying((current) => {
      if (current) return false;
      setProgress(readProgress());
      return true;
    });
  }, [readProgress]);

  return { playing, speed, progress, setSpeed, toggle, restart, readProgress, setProgress };
}
