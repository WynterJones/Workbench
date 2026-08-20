import { useEffect, useRef, useState } from "react";

const STEP_MS = 260;

export function useTimelinePlayback(
  available: number,
  onNeedMore: () => void,
  hasMore: boolean,
) {
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [revealed, setRevealed] = useState(available);
  const manual = useRef(false);

  useEffect(() => {
    if (!buffering) return;
    if (hasMore) {
      onNeedMore();
      return;
    }
    setBuffering(false);
    setRevealed(0);
    setPlaying(true);
  }, [buffering, hasMore, onNeedMore]);

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

  function start() {
    manual.current = true;
    if (hasMore) {
      setBuffering(true);
      return;
    }
    setRevealed(0);
    setPlaying(true);
  }

  function toggle() {
    manual.current = true;
    if (playing) {
      setPlaying(false);
      return;
    }
    if (buffering) {
      setBuffering(false);
      return;
    }
    if (revealed >= available && !hasMore) {
      setRevealed(0);
      setPlaying(true);
      return;
    }
    if (revealed >= available) {
      start();
      return;
    }
    setPlaying(true);
  }

  function restart() {
    start();
  }

  function showAll() {
    manual.current = false;
    setPlaying(false);
    setRevealed(available);
  }

  return { playing, buffering, speed, revealed, setSpeed, toggle, restart, showAll };
}
