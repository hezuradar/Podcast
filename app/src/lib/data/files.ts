import "server-only";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { MEDIA_DIR } from "./db";

/** Resolves a path stored in the database, refusing anything outside data/media. */
export function mediaPath(relativePath: string): string | null {
  const root = resolve(MEDIA_DIR);
  const full = resolve(root, relativePath);
  return full.startsWith(root + sep) ? full : null;
}

/** Streams a media file as a Response, or 404 if it is missing. */
export async function fileResponse(relativePath: string, contentType: string, downloadName?: string): Promise<Response> {
  const full = mediaPath(relativePath);
  if (!full) return Response.json({ ok: false, error: "Ruta no válida" }, { status: 400 });
  try {
    const info = await stat(full);
    const headers: Record<string, string> = {
      "content-type": contentType,
      "content-length": String(info.size),
      "cache-control": "no-store",
    };
    if (downloadName) headers["content-disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`;
    return new Response(Readable.toWeb(createReadStream(full)) as ReadableStream, { headers });
  } catch {
    return Response.json({ ok: false, error: "Archivo no encontrado" }, { status: 404 });
  }
}
