import "server-only";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import type { EditDoc, Word } from "../doc/types";
import { getDb, MEDIA_DIR, nowIso, transaction } from "./db";

// SQLite data layer (data/app.db). Same functions the screens used with the fake layer, plus
// assets, jobs and exports for the worker pipeline.

export type ProjectSummary = { id: string; title: string; updatedAt: string; durationMs: number };
export type Speaker = { id: string; label: string };
export type JobType = "transcode" | "transcribe" | "diarize" | "enhance" | "render";
export type JobStatus = "queued" | "running" | "done" | "error" | "cancelled";
export type Job = { id: string; type: JobType; status: JobStatus; progress: number; error: string | null; assetId: string | null };
export type Asset = {
  id: string;
  kind: "audio" | "video";
  source: "recording" | "upload";
  originalName: string | null;
  status: "uploading" | "recording" | "processing" | "ready" | "error";
  hasProxy: boolean;
  /** Strength the enhanced copy was made with, or null if there is none yet. */
  enhancedStrength: number | null;
  hasTranscript: boolean;
  durationMs: number | null;
  error: string | null;
};
export type EnhanceSettings = { enabled: boolean; strength: number };
export type ProjectDetail = ProjectSummary & {
  doc: EditDoc;
  docVersion: number;
  words: Word[];
  speakers: Speaker[];
  assets: Asset[];
  jobs: Job[];
  enhance: EnhanceSettings;
};
export type SaveResult = { ok: true; docVersion: number } | { ok: false; reason: "not_found" | "conflict" };
export type ExportKind = "audio_mp3" | "audio_wav";
export type ExportRecord = { id: string; kind: ExportKind; status: "queued" | "rendering" | "ready" | "error"; error: string | null; outputPath: string | null };

type Row = Record<string, unknown>;

const str = (value: unknown): string => String(value ?? "");
const num = (value: unknown): number => Number(value ?? 0);
const strOrNull = (value: unknown): string | null => (value === null || value === undefined ? null : String(value));

function toSummary(row: Row): ProjectSummary {
  return { id: str(row.id), title: str(row.title), updatedAt: str(row.updated_at), durationMs: num(row.duration_ms) };
}

function toJob(row: Row): Job {
  return {
    id: str(row.id),
    type: str(row.type) as JobType,
    status: str(row.status) as JobStatus,
    progress: num(row.progress),
    error: strOrNull(row.error),
    assetId: strOrNull(row.asset_id),
  };
}

function parseDoc(json: unknown): EditDoc {
  try {
    const parsed = JSON.parse(str(json)) as EditDoc;
    return Array.isArray(parsed.blocks) ? parsed : { blocks: [] };
  } catch {
    return { blocks: [] };
  }
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const rows = getDb().prepare("SELECT id, title, updated_at, duration_ms FROM projects ORDER BY updated_at DESC LIMIT 500").all();
  return (rows as Row[]).map(toSummary);
}

export async function listActiveJobs(projectId: string): Promise<Job[]> {
  const rows = getDb()
    .prepare("SELECT * FROM jobs WHERE project_id = ? AND status IN ('queued','running','error') ORDER BY created_at DESC LIMIT 50")
    .all(projectId);
  return (rows as Row[]).map(toJob);
}

export async function getProject(id: string): Promise<ProjectDetail | null> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Row | undefined;
  if (!row) return null;

  const words = (
    db
      .prepare(
        `SELECT w.id, w.idx, w.text, w.start_ms, w.end_ms, w.speaker_id, t.asset_id
         FROM words w JOIN transcripts t ON t.id = w.transcript_id JOIN media_assets a ON a.id = t.asset_id
         WHERE a.project_id = ? ORDER BY t.created_at, w.idx`,
      )
      .all(id) as Row[]
  ).map(
    (w): Word => ({
      id: str(w.id),
      assetId: str(w.asset_id),
      idx: num(w.idx),
      text: str(w.text),
      startMs: num(w.start_ms),
      endMs: num(w.end_ms),
      speakerId: strOrNull(w.speaker_id),
    }),
  );
  const speakers = (db.prepare("SELECT id, label FROM speakers WHERE project_id = ? ORDER BY created_at").all(id) as Row[]).map(
    (s) => ({ id: str(s.id), label: str(s.label) }),
  );
  const assetRows = db
    .prepare(
      `SELECT a.*, EXISTS (SELECT 1 FROM transcripts t WHERE t.asset_id = a.id) AS has_transcript
       FROM media_assets a WHERE a.project_id = ? ORDER BY a.created_at`,
    )
    .all(id) as Row[];
  const assets = assetRows.map(
    (a): Asset => ({
      id: str(a.id),
      kind: str(a.kind) as Asset["kind"],
      source: str(a.source) as Asset["source"],
      originalName: strOrNull(a.original_name),
      status: str(a.status) as Asset["status"],
      hasProxy: a.proxy_dir !== null,
      enhancedStrength: a.enhanced_path === null || a.enhanced_strength === null ? null : num(a.enhanced_strength),
      hasTranscript: num(a.has_transcript) === 1,
      durationMs: a.duration_ms === null ? null : num(a.duration_ms),
      error: strOrNull(a.error),
    }),
  );

  return {
    ...toSummary(row),
    doc: parseDoc(row.doc_json),
    docVersion: num(row.doc_version),
    words,
    speakers,
    assets,
    jobs: await listActiveJobs(id),
    enhance: { enabled: num(row.enhance_enabled) === 1, strength: num(row.enhance_strength) },
  };
}

/**
 * Saves the voice-enhancement settings. When enabled, queues an `enhance` job for every processed
 * asset not yet enhanced at this strength (the worker always uses the project's latest strength).
 */
export async function setEnhance(projectId: string, settings: EnhanceSettings): Promise<boolean> {
  const now = nowIso();
  return transaction((db) => {
    const updated = db
      .prepare("UPDATE projects SET enhance_enabled = ?, enhance_strength = ?, updated_at = ? WHERE id = ?")
      .run(settings.enabled ? 1 : 0, settings.strength, now, projectId);
    if (Number(updated.changes) === 0) return false;
    if (!settings.enabled) return true;
    const pending = db
      .prepare(
        `SELECT id FROM media_assets WHERE project_id = ? AND master_path IS NOT NULL
         AND (enhanced_path IS NULL OR enhanced_strength IS NULL OR enhanced_strength != ?)`,
      )
      .all(projectId, settings.strength) as Row[];
    const insert = db.prepare(
      "INSERT INTO jobs (id, project_id, asset_id, type, payload, created_at, updated_at) VALUES (?, ?, ?, 'enhance', '{}', ?, ?)",
    );
    for (const asset of pending) {
      try {
        insert.run(randomUUID(), projectId, str(asset.id), now, now);
      } catch {
        // an enhance job is already queued or running for this asset; it will pick up the new strength
      }
    }
    return true;
  });
}

export async function createProject(title: string): Promise<ProjectSummary> {
  const id = randomUUID();
  const now = nowIso();
  getDb().prepare("INSERT INTO projects (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, title, now, now);
  return { id, title, updatedAt: now, durationMs: 0 };
}

export async function deleteProject(id: string): Promise<boolean> {
  const result = getDb().prepare("DELETE FROM projects WHERE id = ?").run(id);
  await rm(projectMediaDir(id), { recursive: true, force: true });
  return Number(result.changes) > 0;
}

/** Optimistic concurrency: the save only applies if nobody saved since `expectedVersion`. */
export async function saveDocument(id: string, doc: EditDoc, expectedVersion: number): Promise<SaveResult> {
  const result = getDb()
    .prepare("UPDATE projects SET doc_json = ?, doc_version = doc_version + 1, updated_at = ? WHERE id = ? AND doc_version = ?")
    .run(JSON.stringify(doc), nowIso(), id, expectedVersion);
  if (Number(result.changes) === 1) return { ok: true, docVersion: expectedVersion + 1 };
  const exists = getDb().prepare("SELECT 1 FROM projects WHERE id = ?").get(id);
  return { ok: false, reason: exists ? "conflict" : "not_found" };
}

/** Folder for one project's files. The id is a UUID we generated, never user input. */
export function projectMediaDir(projectId: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) throw new Error("Invalid project id");
  return resolve(MEDIA_DIR, projectId);
}

type NewAsset = {
  assetId: string;
  projectId: string;
  kind: Asset["kind"];
  source: Asset["source"];
  originalName: string;
  /** Relative to MEDIA_DIR. */
  originalPath: string;
  sizeBytes: number;
  language: string;
  /** false: only prepare the audio (playable, enhanceable, exportable); transcribe later on demand. */
  transcribe: boolean;
};

export async function projectExists(id: string): Promise<boolean> {
  return getDb().prepare("SELECT 1 FROM projects WHERE id = ?").get(id) !== undefined;
}

/** Registers an uploaded file and queues its processing (transcode, then transcribe). */
export async function createAssetWithJobs(input: NewAsset): Promise<string> {
  const { assetId } = input;
  const now = nowIso();
  transaction((db) => {
    db.prepare(
      `INSERT INTO media_assets (id, project_id, kind, source, original_name, original_path, size_bytes, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'processing', ?, ?)`,
    ).run(assetId, input.projectId, input.kind, input.source, input.originalName, input.originalPath, input.sizeBytes, now, now);
    db.prepare(
      "INSERT INTO jobs (id, project_id, asset_id, type, payload, created_at, updated_at) VALUES (?, ?, ?, 'transcode', ?, ?, ?)",
    ).run(randomUUID(), input.projectId, assetId, JSON.stringify({ language: input.language, transcribe: input.transcribe }), now, now);
    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now, input.projectId);
  });
  return assetId;
}

export async function getAssetFile(
  assetId: string,
): Promise<{ projectId: string; proxyPath: string | null; enhancedProxyPath: string | null } | null> {
  const row = getDb().prepare("SELECT project_id, proxy_dir, enhanced_path FROM media_assets WHERE id = ?").get(assetId) as
    | Row
    | undefined;
  if (!row) return null;
  const enhanced = strOrNull(row.enhanced_path);
  return {
    projectId: str(row.project_id),
    proxyPath: strOrNull(row.proxy_dir),
    // The worker writes the enhanced playback copy next to the enhanced master.
    enhancedProxyPath: enhanced ? enhanced.replace(/enhanced\.wav$/, "proxy-enhanced.wav") : null,
  };
}

type Segment = { assetId: string; inMs: number; outMs: number };

/** Creates an export of the given edit and queues the render job for the worker. */
export async function createExport(
  projectId: string,
  kind: ExportKind,
  docVersion: number,
  segments: Segment[],
  enhance: EnhanceSettings,
): Promise<string> {
  const exportId = randomUUID();
  const jobId = randomUUID();
  const now = nowIso();
  const payload = { exportId, kind, segments, enhance: enhance.enabled, strength: enhance.strength };
  transaction((db) => {
    db.prepare(
      "INSERT INTO jobs (id, project_id, type, payload, created_at, updated_at) VALUES (?, ?, 'render', ?, ?, ?)",
    ).run(jobId, projectId, JSON.stringify(payload), now, now);
    db.prepare(
      `INSERT INTO exports (id, project_id, job_id, kind, doc_version, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'queued', ?, ?)`,
    ).run(exportId, projectId, jobId, kind, docVersion, now, now);
  });
  return exportId;
}

export async function getExport(exportId: string): Promise<(ExportRecord & { projectId: string }) | null> {
  const row = getDb().prepare("SELECT * FROM exports WHERE id = ?").get(exportId) as Row | undefined;
  if (!row) return null;
  return {
    id: str(row.id),
    projectId: str(row.project_id),
    kind: str(row.kind) as ExportKind,
    status: str(row.status) as ExportRecord["status"],
    error: strOrNull(row.error),
    outputPath: strOrNull(row.output_path),
  };
}

export type QueueResult = { ok: true } | { ok: false; reason: "not_found" | "not_ready" | "already_transcribed" | "already_queued" };

/** Queues the transcription of one prepared asset that has none yet. */
export async function queueTranscription(assetId: string, language: string): Promise<QueueResult> {
  const db = getDb();
  const asset = db
    .prepare(
      `SELECT a.project_id, a.proxy_dir, EXISTS (SELECT 1 FROM transcripts t WHERE t.asset_id = a.id) AS has_transcript
       FROM media_assets a WHERE a.id = ?`,
    )
    .get(assetId) as Row | undefined;
  if (!asset) return { ok: false, reason: "not_found" };
  if (asset.proxy_dir === null) return { ok: false, reason: "not_ready" };
  if (num(asset.has_transcript) === 1) return { ok: false, reason: "already_transcribed" };
  const now = nowIso();
  try {
    db.prepare(
      "INSERT INTO jobs (id, project_id, asset_id, type, payload, created_at, updated_at) VALUES (?, ?, ?, 'transcribe', ?, ?, ?)",
    ).run(randomUUID(), str(asset.project_id), assetId, JSON.stringify({ language }), now, now);
  } catch {
    return { ok: false, reason: "already_queued" };
  }
  return { ok: true };
}

/**
 * Cancels a queued or running transcription. A running one is stopped by the worker within a few
 * seconds (it checks the status while transcribing); the audio stays, untranscribed.
 */
export async function cancelTranscription(jobId: string): Promise<boolean> {
  const result = getDb()
    .prepare(
      "UPDATE jobs SET status = 'cancelled', updated_at = ? WHERE id = ? AND type = 'transcribe' AND status IN ('queued', 'running')",
    )
    .run(nowIso(), jobId);
  return Number(result.changes) === 1;
}

export async function dismissJobError(projectId: string, jobId: string): Promise<void> {
  getDb().prepare("UPDATE jobs SET status = 'cancelled', updated_at = ? WHERE id = ? AND project_id = ? AND status = 'error'").run(nowIso(), jobId, projectId);
}
