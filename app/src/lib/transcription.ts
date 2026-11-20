import type { Language } from "./media";

async function post(url: string, body?: unknown): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "No se pudo completar la acción");
  }
}

/** Asks the worker to transcribe an audio that has no transcript yet. */
export function requestTranscription(assetId: string, language: Language): Promise<void> {
  return post(`/api/assets/${encodeURIComponent(assetId)}/transcribe`, { language });
}

/** Stops a queued or running transcription; the audio stays, untranscribed. */
export function cancelTranscription(jobId: string): Promise<void> {
  return post(`/api/jobs/${encodeURIComponent(jobId)}/cancel`);
}
