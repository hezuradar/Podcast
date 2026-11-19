"use client";

import { useEffect, useRef, useState } from "react";
import type { EdlPlayer } from "@/lib/audio/player";
import type { Edl } from "@/lib/edl/edl";

/**
 * Playback over the edited timeline. With the audio loaded it drives the Web Audio player; without
 * it (still processing) it runs a silent clock so the word highlight still works.
 * Any edit while playing restarts playback from the current position with the new edit.
 */
export function usePlayback(edl: Edl, player: EdlPlayer | null) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  // Changing this object restarts playback from currentRef (after a seek).
  const [restartToken, setRestartToken] = useState({});
  const currentRef = useRef(0);
  const totalMs = edl.totalMs;

  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    const from = Math.min(currentRef.current, totalMs);
    const startedAt = performance.now();
    player?.play(edl, from, () => setIsPlaying(false));

    const tick = (now: number) => {
      const position = player ? player.currentMs() : from + (now - startedAt);
      if (position >= totalMs) {
        currentRef.current = totalMs;
        setCurrentMs(totalMs);
        setIsPlaying(false);
        return;
      }
      currentRef.current = position;
      setCurrentMs(position);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      player?.stop();
    };
  }, [isPlaying, restartToken, edl, totalMs, player]);

  const seek = (ms: number) => {
    const clamped = Math.min(Math.max(ms, 0), totalMs);
    currentRef.current = clamped;
    setCurrentMs(clamped);
    setRestartToken({});
  };

  const toggle = () => {
    if (totalMs <= 0) return;
    if (!isPlaying && currentRef.current >= totalMs) seek(0);
    setIsPlaying((playing) => !playing);
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
