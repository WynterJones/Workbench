import { useEffect, useRef, useState } from "react";

const STEP_MS = 220;

export function useTimelinePlayback(available: number, onNeedMore: () => void) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [revealed, setRevealed] = useState(available);
  const manual = useRef(false);

  useEffect(() => {
    if (!manual.current) setRevealed(available);
  }, [available]);

  useEffect(() => {
    if (!playing) return;

    const timer = setInterval(() => {
      setRevealed((current) => {
        if (current >= available) {
          onNeedMore();
          return current;
        }
        return current + 1;
      });
    }, STEP_MS / speed);

    return () => clearInterval(timer);
  }, [playing, speed, available, onNeedMore]);

  function toggle() {
    manual.current = true;
    setPlaying((current) => {
      if (!current && revealed >= available) setRevealed(0);
      return !current;
    });
  }

  function restart() {
    manual.current = true;
    setRevealed(0);
    setPlaying(true);
  }

  function showAll() {
    manual.current = false;
    setPlaying(false);
    setRevealed(available);
  }

  return { playing, speed, revealed, setSpeed, toggle, restart, showAll };
}
