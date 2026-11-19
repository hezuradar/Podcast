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

/** Loads the playback proxies of every ready asset into one Web Audio player. */
export function useProjectAudio(assets: Asset[]): { player: EdlPlayer | null; state: AudioState } {
  // Cheap to create: the AudioContext itself is only made when the first file loads.
  const [player] = useState(() => new EdlPlayer());
  const readyIds = useMemo(() => assets.filter((a) => a.hasProxy).map((a) => a.id), [assets]);
  const idsKey = readyIds.join(",");
  const [loaded, setLoaded] = useState<{ key: string; state: AudioState }>({ key: "", state: "none" });

  useEffect(() => {
    if (readyIds.length === 0) return;
    let cancelled = false;
    Promise.all(readyIds.map((id) => player.load(id, `/api/assets/${id}/proxy`)))
      .then(() => !cancelled && setLoaded({ key: idsKey, state: "ready" }))
      .catch(() => !cancelled && setLoaded({ key: idsKey, state: "error" }));
    return () => {
      cancelled = true;
    };
  }, [idsKey, readyIds, player]);

  if (readyIds.length === 0) return { player: null, state: "none" };
  const state = loaded.key === idsKey ? loaded.state : "loading";
  return { player: state === "ready" ? player : null, state };
}
