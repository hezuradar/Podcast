"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EdlPlayer } from "@/lib/audio/player";
import type { Asset, Job } from "@/lib/data/projects";

const POLL_MS = 1500;

const isActive = (job: Job) => job.status === "queued" || job.status === "running";

/**
 * Polls the project's jobs while something is queued or running, and refreshes the page data when one
 * finishes (a new transcript or a ready audio appears without reloading). Mount it with a `key` built
 * from the server's jobs so it starts over after an upload.
 */
export function useJobs(projectId: string, initial: Job[]): Job[] {
  const [jobs, setJobs] = useState(initial);
  const router = useRouter();
  const hasActive = jobs.some(isActive);

  useEffect(() => {
    if (!hasActive) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/jobs`, { cache: "no-store" });
        const body = (await response.json()) as { jobs?: Job[] };
        if (cancelled || !body.jobs) return;
        const stillActive = new Set(body.jobs.filter(isActive).map((job) => job.id));
        const finished = jobs.some((job) => isActive(job) && !stillActive.has(job.id));
        setJobs(body.jobs);
        if (finished) router.refresh();
      } catch {
        // network hiccup: try again on the next tick
      }
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [hasActive, jobs, projectId, router]);

  return jobs;
}

export type AudioState = "none" | "loading" | "ready" | "error";

type Variant = "original" | "enhanced";

/**
 * Loads the playback copies of every processed asset into a Web Audio player: the original ones, or
 * the voice-enhanced ones when `useEnhanced` (each variant keeps its own player, so switching back
 * and forth to compare is instant once both are loaded).
 */
export function useProjectAudio(assets: Asset[], useEnhanced: boolean): { player: EdlPlayer | null; state: AudioState } {
  // Cheap to create: each AudioContext is only made when its first file loads.
  const [players] = useState<Record<Variant, EdlPlayer>>(() => ({ original: new EdlPlayer(), enhanced: new EdlPlayer() }));
  const variant: Variant = useEnhanced ? "enhanced" : "original";
  const player = players[variant];

  const sources = useMemo(
    () =>
      assets
        .filter((asset) => (useEnhanced ? asset.enhancedStrength !== null : asset.hasProxy))
        .map((asset) => {
          const version = useEnhanced ? String(asset.enhancedStrength) : "original";
          const url = `/api/assets/${asset.id}/proxy${useEnhanced ? `?enhanced=1&v=${version}` : ""}`;
          return { id: asset.id, url, version };
        }),
    [assets, useEnhanced],
  );
  const sourcesKey = `${variant}|${sources.map((s) => `${s.id}@${s.version}`).join(",")}`;
  const [loaded, setLoaded] = useState<{ key: string; state: AudioState }>({ key: "", state: "none" });

  useEffect(() => {
    if (sources.length === 0) return;
    let cancelled = false;
    Promise.all(sources.map((source) => player.load(source.id, source.url, source.version)))
      .then(() => !cancelled && setLoaded({ key: sourcesKey, state: "ready" }))
      .catch(() => !cancelled && setLoaded({ key: sourcesKey, state: "error" }));
    return () => {
      cancelled = true;
    };
  }, [sourcesKey, sources, player]);

  if (sources.length === 0) return { player: null, state: "none" };
  const state = loaded.key === sourcesKey ? loaded.state : "loading";
  return { player: state === "ready" ? player : null, state };
}
