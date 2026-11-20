"""Job worker for the podcast editor.

Polls data/app.db for queued jobs and runs them one at a time. Start it with `npm run dev` (it runs
next to Next.js) or directly: worker/.venv/Scripts/python worker/main.py
"""

from __future__ import annotations

import json
import logging
import os
import sqlite3
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from jobs import HANDLERS, Context, JobCancelled, JobError, fail_export  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("DATA_DIR", ROOT / "data")).resolve()
POLL_SECONDS = 1.0
MAX_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = 5
STALE_LOCK = timedelta(minutes=10)

log = logging.getLogger("worker")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def connect() -> sqlite3.Connection:
    """Waits for the app to create the database (it runs the migrations), then opens it."""
    db_path = DATA_DIR / "app.db"
    while not db_path.exists():
        log.info("Esperando a que la app cree %s ...", db_path)
        time.sleep(2)
    conn = sqlite3.connect(db_path, timeout=5, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 5000")
    return conn


def release_stale_locks(conn: sqlite3.Connection) -> None:
    cutoff = (datetime.now(timezone.utc) - STALE_LOCK).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    released = conn.execute(
        "UPDATE jobs SET status = 'queued', locked_at = NULL, updated_at = ? WHERE status = 'running' AND locked_at < ?",
        (now_iso(), cutoff),
    ).rowcount
    if released:
        log.warning("%d trabajos bloqueados vuelven a la cola", released)


def claim(conn: sqlite3.Connection) -> sqlite3.Row | None:
    conn.execute("BEGIN IMMEDIATE")
    try:
        job = conn.execute("SELECT * FROM jobs WHERE status = 'queued' ORDER BY created_at LIMIT 1").fetchone()
        if job is not None:
            conn.execute(
                "UPDATE jobs SET status = 'running', attempts = attempts + 1, locked_at = ?, updated_at = ? WHERE id = ?",
                (now_iso(), now_iso(), job["id"]),
            )
        conn.execute("COMMIT")
        return job
    except Exception:
        conn.execute("ROLLBACK")
        raise


def finish(conn: sqlite3.Connection, job_id: str, status: str, error: str | None = None) -> None:
    conn.execute(
        "UPDATE jobs SET status = ?, error = ?, progress = CASE WHEN ? = 'done' THEN 1 ELSE progress END, "
        "locked_at = NULL, updated_at = ? WHERE id = ? AND status != 'cancelled'",  # a cancel always wins
        (status, error, status, now_iso(), job_id),
    )


def mark_asset_error(conn: sqlite3.Connection, job: sqlite3.Row, message: str) -> None:
    if job["asset_id"]:
        conn.execute(
            "UPDATE media_assets SET status = 'error', error = ?, updated_at = ? WHERE id = ?",
            (message, now_iso(), job["asset_id"]),
        )


def run_job(ctx: Context, job: sqlite3.Row) -> None:
    payload = json.loads(job["payload"] or "{}")
    handler = HANDLERS.get(job["type"])
    log.info("Empieza %s %s (intento %d)", job["type"], job["id"], job["attempts"] + 1)
    try:
        if handler is None:
            raise JobError(f"Tipo de trabajo no soportado: {job['type']}")
        handler(ctx, job, payload)
        finish(ctx.conn, job["id"], "done")
        log.info("Hecho %s %s", job["type"], job["id"])
    except JobCancelled:
        log.info("Cancelado por el usuario: %s %s", job["type"], job["id"])
    except JobError as error:
        message = str(error)
        finish(ctx.conn, job["id"], "error", message)
        mark_asset_error(ctx.conn, job, message)
        fail_export(ctx, payload, message)
        log.warning("Error definitivo en %s: %s", job["id"], message)
    except Exception as error:  # unexpected: retry a few times before giving up
        log.exception("Fallo en %s", job["id"])
        if job["attempts"] + 1 < MAX_ATTEMPTS:
            time.sleep(RETRY_BACKOFF_SECONDS * (job["attempts"] + 1))  # give a transient problem time to clear
            finish(ctx.conn, job["id"], "queued", str(error)[:500])
        else:
            message = "Error inesperado al procesar. Revisa el registro del worker."
            finish(ctx.conn, job["id"], "error", message)
            mark_asset_error(ctx.conn, job, message)
            fail_export(ctx, payload, message)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="[worker] %(asctime)s %(levelname)s %(message)s")
    conn = connect()
    ctx = Context(conn=conn, media_dir=DATA_DIR / "media", now=now_iso)
    release_stale_locks(conn)
    log.info("Worker listo. Datos en %s", DATA_DIR)
    while True:
        job = claim(conn)
        if job is None:
            time.sleep(POLL_SECONDS)
            continue
        run_job(ctx, job)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
