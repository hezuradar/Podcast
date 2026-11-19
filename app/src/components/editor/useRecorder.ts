"use client";

import { useEffect, useRef, useState } from "react";

export type RecorderState = "ready" | "recording" | "paused";

const MIME_TYPE = "audio/webm;codecs=opus";
const CHUNK_MS = 1000;

/**
 * Microphone recording with MediaRecorder. `stop` resolves with the recorded file.
 * Errors (no microphone, permission denied) are returned as a user-facing message.
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>("ready");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (state !== "recording") return;
    const timer = setInterval(() => setElapsedMs((ms) => ms + 250), 250);
    return () => clearInterval(timer);
  }, [state]);

  useEffect(() => () => recorderRef.current?.stream.getTracks().forEach((track) => track.stop()), []);

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Este navegador no puede grabar audio");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
      const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported(MIME_TYPE) ? { mimeType: MIME_TYPE } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => event.data.size > 0 && chunksRef.current.push(event.data);
      recorder.start(CHUNK_MS);
      recorderRef.current = recorder;
      setElapsedMs(0);
      setState("recording");
    } catch (caught) {
      const denied = caught instanceof DOMException && caught.name === "NotAllowedError";
      setError(denied ? "No hay permiso para usar el micrófono" : "No se encontró ningún micrófono");
    }
  };

  const togglePause = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      setState("paused");
    } else if (recorder.state === "paused") {
      recorder.resume();
      setState("recording");
    }
  };

  const stop = (): Promise<File | null> =>
    new Promise((resolvePromise) => {
      const recorder = recorderRef.current;
      if (!recorder) {
        resolvePromise(null);
        return;
      }
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((track) => track.stop());
        const type = recorder.mimeType || "audio/webm";
        const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
        resolvePromise(new File(chunksRef.current, `grabacion-${stamp}.webm`, { type }));
        recorderRef.current = null;
        setState("ready");
      };
      recorder.stop();
    });

  return { state, elapsedMs, error, start, togglePause, stop };
}
