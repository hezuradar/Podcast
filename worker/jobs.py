"""Job handlers: transcode, transcribe, render. Each gets the open DB connection and the job row."""

from __future__ import annotations

import json
import os
import sqlite3
import subprocess
import tempfile
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from media import Segment, asr_words, build_filter, enhance_chain

PROXY_SAMPLE_RATE = 24_000
MASTER_SAMPLE_RATE = 48_000
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "small")
DEFAULT_SPEAKER = "Voz 1"


class JobError(Exception):
    """A failure the user must fix (bad file, no speech): not retried."""


@dataclass
class Context:
    conn: sqlite3.Connection
    media_dir: Path
    now: Callable[[], str]

    def path(self, relative: str) -> Path:
        full = (self.media_dir / relative).resolve()
        if self.media_dir.resolve() not in full.parents:
            raise JobError("Ruta de archivo no válida")
        return full

    def relative(self, full: Path) -> str:
        return full.resolve().relative_to(self.media_dir.resolve()).as_posix()

    def progress(self, job_id: str, value: float) -> None:
        self.conn.execute(
            "UPDATE jobs SET progress = ?, updated_at = ? WHERE id = ?", (max(0.0, min(1.0, value)), self.now(), job_id)
        )


def run(args: list[str]) -> str:
    """Runs a tool with an argument list (never through a shell) and returns stdout."""
    result = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        raise RuntimeError(f"{Path(args[0]).name} failed: {result.stderr[-800:]}")
    return result.stdout


def probe(path: Path) -> tuple[int, int, int]:
    """(duration_ms, sample_rate, channels) of the first audio stream; JobError if there is none.
    duration_ms is 0 when the container does not store it (browser MediaRecorder WebM files)."""
    info = json.loads(run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(path)]))
    audio = next((s for s in info.get("streams", []) if s.get("codec_type") == "audio"), None)
    if audio is None:
        raise JobError("El archivo no tiene pista de audio")
    try:
        duration = float(info.get("format", {}).get("duration") or audio.get("duration") or 0)
    except ValueError:
        duration = 0.0
    return int(duration * 1000), int(audio.get("sample_rate") or 0), int(audio.get("channels") or 0)


def encode(source: Path, target: Path, extra: list[str]) -> None:
    """ffmpeg to a temporary file, then rename: a crash never leaves a half-written file behind."""
    tmp = target.with_suffix(".part" + target.suffix)
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-vn", *extra, str(tmp)])
    os.replace(tmp, target)


def queue_job(ctx: Context, project_id: str, asset_id: str | None, job_type: str, payload: dict) -> None:
    try:
        ctx.conn.execute(
            "INSERT INTO jobs (id, project_id, asset_id, type, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), project_id, asset_id, job_type, json.dumps(payload), ctx.now(), ctx.now()),
        )
    except sqlite3.IntegrityError:
        pass  # the same job is already queued or running for this asset


def transcode(ctx: Context, job: sqlite3.Row, payload: dict) -> None:
    asset = ctx.conn.execute("SELECT * FROM media_assets WHERE id = ?", (job["asset_id"],)).fetchone()
    if asset is None:
        raise JobError("El audio ya no existe")
    original = ctx.path(asset["original_path"])
    duration_ms, sample_rate, channels = probe(original)
    master = original.with_name("master.wav")
    proxy = original.with_name("proxy.wav")
    encode(original, master, ["-ac", str(min(max(channels, 1), 2)), "-ar", str(MASTER_SAMPLE_RATE), "-c:a", "pcm_s16le"])
    if duration_ms <= 0:  # the WAV we just wrote always knows its length
        duration_ms = probe(master)[0]
    if duration_ms <= 0:
        raise JobError("El audio está vacío")
    ctx.progress(job["id"], 0.6)
    encode(original, proxy, ["-ac", "1", "-ar", str(PROXY_SAMPLE_RATE), "-c:a", "pcm_s16le"])
    ctx.conn.execute(
        """UPDATE media_assets SET master_path = ?, proxy_dir = ?, duration_ms = ?, sample_rate = ?, channels = ?,
           updated_at = ? WHERE id = ?""",
        (ctx.relative(master), ctx.relative(proxy), duration_ms, sample_rate, channels, ctx.now(), asset["id"]),
    )
    queue_job(ctx, asset["project_id"], asset["id"], "transcribe", {"language": payload.get("language", "es")})
    enabled, _strength = project_enhance(ctx, asset["project_id"])
    if enabled:
        queue_job(ctx, asset["project_id"], asset["id"], "enhance", {})


def project_enhance(ctx: Context, project_id: str) -> tuple[bool, int]:
    row = ctx.conn.execute("SELECT enhance_enabled, enhance_strength FROM projects WHERE id = ?", (project_id,)).fetchone()
    return (bool(row["enhance_enabled"]), int(row["enhance_strength"])) if row else (False, 70)


def enhance(ctx: Context, job: sqlite3.Row, payload: dict) -> None:
    """Cleans and levels one asset (see media.enhance_chain) and makes its light playback copy.
    Uses the project's *current* strength, and re-queues itself if the user moved the slider meanwhile."""
    asset = ctx.conn.execute("SELECT * FROM media_assets WHERE id = ?", (job["asset_id"],)).fetchone()
    if asset is None or not asset["master_path"]:
        raise JobError("El audio no está preparado")
    _enabled, strength = project_enhance(ctx, asset["project_id"])
    master = ctx.path(asset["master_path"])
    enhanced = master.with_name("enhanced.wav")
    encode(master, enhanced, ["-af", enhance_chain(strength), "-ar", str(MASTER_SAMPLE_RATE), "-c:a", "pcm_s16le"])
    ctx.progress(job["id"], 0.7)
    encode(enhanced, enhanced.with_name("proxy-enhanced.wav"), ["-ac", "1", "-ar", str(PROXY_SAMPLE_RATE), "-c:a", "pcm_s16le"])
    ctx.conn.execute(
        "UPDATE media_assets SET enhanced_path = ?, enhanced_strength = ?, updated_at = ? WHERE id = ?",
        (ctx.relative(enhanced), strength, ctx.now(), asset["id"]),
    )
    enabled_now, strength_now = project_enhance(ctx, asset["project_id"])
    if enabled_now and strength_now != strength:
        ctx.conn.execute(  # this job still counts as running: free the slot before queuing the next one
            "UPDATE jobs SET status = 'done', progress = 1, updated_at = ? WHERE id = ?", (ctx.now(), job["id"])
        )
        queue_job(ctx, asset["project_id"], asset["id"], "enhance", {})


_model = None


def whisper():
    """Loads the model once per worker process (first use downloads it to the Hugging Face cache)."""
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        _model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    return _model


WHISPER_SAMPLE_RATE = 16_000


def load_audio_16k(path: Path):
    """Mono float32 samples at 16 kHz decoded by ffmpeg. Avoids faster-whisper's PyAV decoder,
    whose API changed in recent PyAV releases (open(..., metadata_errors=...) no longer exists)."""
    import numpy as np

    result = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(path), "-f", "f32le", "-ac", "1",
         "-ar", str(WHISPER_SAMPLE_RATE), "-"],
        capture_output=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr.decode('utf-8', 'replace')[-800:]}")
    return np.frombuffer(result.stdout, dtype=np.float32)


def transcribe(ctx: Context, job: sqlite3.Row, payload: dict) -> None:
    asset = ctx.conn.execute("SELECT * FROM media_assets WHERE id = ?", (job["asset_id"],)).fetchone()
    if asset is None or not asset["proxy_dir"]:
        raise JobError("El audio no está preparado")
    language = payload.get("language", "es")
    duration_s = max((asset["duration_ms"] or 1) / 1000, 1)
    samples = load_audio_16k(ctx.path(asset["proxy_dir"]))
    segments, _info = whisper().transcribe(samples, language=language, word_timestamps=True, vad_filter=True)
    collected = []
    for segment in segments:  # lazy generator: transcription happens while iterating
        collected.append(segment)
        ctx.progress(job["id"], segment.end / duration_s)
    words = asr_words(collected)
    if not words:
        raise JobError("No se ha detectado voz en el audio")
    save_transcript(ctx, asset, language, words)


def save_transcript(ctx: Context, asset: sqlite3.Row, language: str, words: list) -> None:
    """Writes transcript, words and speaker, then appends a speech block to the project document."""
    project_id = asset["project_id"]
    now = ctx.now()
    ctx.conn.execute("BEGIN IMMEDIATE")
    try:
        speaker = ctx.conn.execute(
            "SELECT id FROM speakers WHERE project_id = ? AND label = ?", (project_id, DEFAULT_SPEAKER)
        ).fetchone()
        speaker_id = speaker["id"] if speaker else str(uuid.uuid4())
        if not speaker:
            ctx.conn.execute(
                "INSERT INTO speakers (id, project_id, label, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (speaker_id, project_id, DEFAULT_SPEAKER, now, now),
            )
        ctx.conn.execute("DELETE FROM transcripts WHERE asset_id = ?", (asset["id"],))
        transcript_id = str(uuid.uuid4())
        ctx.conn.execute(
            """INSERT INTO transcripts (id, asset_id, language, model, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, 'done', ?, ?)""",
            (transcript_id, asset["id"], language, f"faster-whisper {Path(WHISPER_MODEL).name}", now, now),
        )
        refs = []
        for idx, word in enumerate(words):
            word_id = str(uuid.uuid4())
            ctx.conn.execute(
                """INSERT INTO words (id, transcript_id, idx, text, start_ms, end_ms, confidence, speaker_id, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (word_id, transcript_id, idx, word.text, word.start_ms, word.end_ms, word.confidence, speaker_id, now),
            )
            refs.append({"k": str(uuid.uuid4()), "w": word_id})
        project = ctx.conn.execute("SELECT doc_json, duration_ms FROM projects WHERE id = ?", (project_id,)).fetchone()
        doc = json.loads(project["doc_json"])
        doc.setdefault("blocks", []).append(
            {"id": str(uuid.uuid4()), "type": "speech", "assetId": asset["id"], "speakerId": speaker_id, "words": refs}
        )
        ctx.conn.execute(
            """UPDATE projects SET doc_json = ?, doc_version = doc_version + 1, duration_ms = ?, updated_at = ?
               WHERE id = ?""",
            (json.dumps(doc), (project["duration_ms"] or 0) + (asset["duration_ms"] or 0), now, project_id),
        )
        ctx.conn.execute("UPDATE media_assets SET status = 'ready', updated_at = ? WHERE id = ?", (now, asset["id"]))
        ctx.conn.execute("COMMIT")
    except Exception:
        ctx.conn.execute("ROLLBACK")
        raise


def render(ctx: Context, job: sqlite3.Row, payload: dict) -> None:
    export_id = payload["exportId"]
    kind = payload["kind"]
    segments = [Segment(s["assetId"], int(s["inMs"]), int(s["outMs"])) for s in payload["segments"]]
    ctx.conn.execute("UPDATE exports SET status = 'rendering', updated_at = ? WHERE id = ?", (ctx.now(), export_id))

    asset_ids = list(dict.fromkeys(s.asset_id for s in segments))
    rows = {
        r["id"]: r
        for r in ctx.conn.execute(
            "SELECT id, master_path, enhanced_path, enhanced_strength, duration_ms FROM media_assets "
            f"WHERE id IN ({','.join('?' * len(asset_ids))})",
            asset_ids,
        )
    }
    missing = [a for a in asset_ids if a not in rows or not rows[a]["master_path"]]
    if missing:
        raise JobError("Falta el audio original de algún fragmento")
    source_column = "master_path"
    if payload.get("enhance"):
        strength = int(payload.get("strength", 70))
        if any(rows[a]["enhanced_path"] is None or rows[a]["enhanced_strength"] != strength for a in asset_ids):
            raise JobError("La mejora de voz todavía se está aplicando. Espera a que termine y vuelve a exportar.")
        source_column = "enhanced_path"

    graph = build_filter(segments, {a: i for i, a in enumerate(asset_ids)}, {a: rows[a]["duration_ms"] for a in asset_ids})
    out_dir = ctx.media_dir / job["project_id"] / "exports"
    out_dir.mkdir(parents=True, exist_ok=True)
    extension, codec = ("mp3", ["-c:a", "libmp3lame", "-q:a", "2"]) if kind == "audio_mp3" else ("wav", ["-c:a", "pcm_s16le"])
    target = out_dir / f"{export_id}.{extension}"
    tmp = target.with_suffix(".part." + extension)

    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as script:
        script.write(graph)
    try:
        inputs = [arg for a in asset_ids for arg in ("-i", str(ctx.path(rows[a][source_column])))]
        run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *inputs, "-/filter_complex", script.name,
             "-map", "[out]", *codec, str(tmp)])
        os.replace(tmp, target)
    finally:
        os.unlink(script.name)
    ctx.conn.execute(
        "UPDATE exports SET status = 'ready', output_path = ?, updated_at = ? WHERE id = ?",
        (ctx.relative(target), ctx.now(), export_id),
    )


def fail_export(ctx: Context, payload: dict, message: str) -> None:
    if "exportId" in payload:
        ctx.conn.execute(
            "UPDATE exports SET status = 'error', error = ?, updated_at = ? WHERE id = ?", (message, ctx.now(), payload["exportId"])
        )


HANDLERS = {"transcode": transcode, "transcribe": transcribe, "enhance": enhance, "render": render}
