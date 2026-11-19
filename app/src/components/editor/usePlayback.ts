"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Playback clock over the edited timeline. In fake mode there is no audio, only the clock, so the
 * highlighted word moves as if the episode were playing. /replica-backend plugs the Web Audio
 * scheduler into the same interface (isPlaying, currentMs, toggle, seek, skip, restart).
 */
export function usePlayback(totalMs: number) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  // Where the clock (re)starts from; a new object restarts the animation loop.
  const [anchor, setAnchor] = useState({ ms: 0 });
  const currentRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const next = anchor.ms + (now - startedAt);
      if (next >= totalMs) {
        currentRef.current = totalMs;
        setCurrentMs(totalMs);
        setIsPlaying(false);
        return;
      }
      currentRef.current = next;
      setCurrentMs(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, anchor, totalMs]);

  const seek = (ms: number) => {
    const clamped = Math.min(Math.max(ms, 0), totalMs);
    currentRef.current = clamped;
    setCurrentMs(clamped);
    setAnchor({ ms: clamped });
  };

  const toggle = () => {
    if (totalMs <= 0) return;
    if (isPlaying) {
      setIsPlaying(false);
      setAnchor({ ms: currentRef.current });
      return;
    }
    if (currentRef.current >= totalMs) seek(0);
    else setAnchor({ ms: currentRef.current });
    setIsPlaying(true);
  };

  return {
    isPlaying,
    currentMs: Math.min(currentMs, totalMs),
    toggle,
    seek,
    skip: (deltaMs: number) => seek(currentRef.current + deltaMs),
    restart: () => seek(0),
  };
}
