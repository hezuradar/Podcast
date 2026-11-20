import "server-only";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * Repo-level data folder (git-ignored): data/app.db and data/media/<project>/...
 * It lives outside the app on purpose (runtime data, shared with the worker), so it is excluded
 * from Next's output file tracing.
 */
export const DATA_DIR = resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR ?? resolve(/*turbopackIgnore: true*/ process.cwd(), "../data"));
export const MEDIA_DIR = resolve(DATA_DIR, "media");
const MIGRATIONS_DIR = resolve(process.cwd(), "db/migrations");

const globalDb = globalThis as unknown as { __db?: DatabaseSync };

/** Applies db/migrations/NNN_*.sql in order, tracked with PRAGMA user_version. */
function migrate(db: DatabaseSync): void {
  const current = Number((db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version);
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => /^\d{3}_.+\.sql$/.test(name))
    .sort();
  for (const file of files) {
    const version = Number(file.slice(0, 3));
    if (version <= current) continue;
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
    db.exec("BEGIN");
    try {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${version}`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/** One connection per server process (survives dev hot reloads). */
export function getDb(): DatabaseSync {
  if (!globalDb.__db) {
    mkdirSync(MEDIA_DIR, { recursive: true });
    const db = new DatabaseSync(resolve(DATA_DIR, "app.db"));
    db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
    migrate(db);
    globalDb.__db = db;
  }
  return globalDb.__db;
}

/** Runs `work` in a transaction; rolls back on any error. */
export function transaction<T>(work: (db: DatabaseSync) => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = work(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}
