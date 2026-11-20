import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createAssetWithJobs, projectExists, projectMediaDir } from "@/lib/data/projects";
import { MEDIA_DIR } from "@/lib/data/db";
import { isLanguage, MAX_UPLOAD_BYTES, mediaExtension, mediaKind } from "@/lib/media";

class TooLargeError extends Error {}

/** Counts bytes on the way to disk and stops the upload past the limit. */
function sizeLimit(max: number): Transform & { bytes: () => number } {
  let total = 0;
  const transform = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      total += chunk.length;
      if (total > max) done(new TooLargeError("too large"));
      else done(null, chunk);
    },
  });
  return Object.assign(transform, { bytes: () => total });
}

function fail(status: number, error: string): Response {
  return Response.json({ ok: false, error }, { status });
}

/**
 * Streams the request body to data/media/<project>/<asset>/original.<ext> (never into memory),
 * then registers the asset and queues transcode + transcribe for the worker.
 * Headers: x-file-name (URI-encoded), x-language (es|en|fr|de|it|pt), x-source (upload|recording).
 */
export async function POST(request: Request, ctx: RouteContext<"/api/projects/[id]/assets">): Promise<Response> {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !(await projectExists(id))) return fail(404, "Proyecto no encontrado");

  let fileName = "";
  try {
    fileName = decodeURIComponent(request.headers.get("x-file-name") ?? "").slice(0, 255);
  } catch {
    return fail(400, "Nombre de archivo no válido");
  }
  const extension = mediaExtension(fileName);
  const language = request.headers.get("x-language");
  const source = request.headers.get("x-source") === "recording" ? "recording" : "upload";
  const transcribe = request.headers.get("x-transcribe") !== "0";
  if (!extension) return fail(415, "Formato no admitido");
  if (!isLanguage(language)) return fail(400, "Idioma no admitido");
  if (!request.body) return fail(400, "No se recibió ningún archivo");

  const assetId = randomUUID();
  const assetDir = join(projectMediaDir(id), assetId);
  const filePath = join(assetDir, `original.${extension}`);
  await mkdir(assetDir, { recursive: true });

  const limit = sizeLimit(MAX_UPLOAD_BYTES);
  try {
    await pipeline(Readable.fromWeb(request.body as import("node:stream/web").ReadableStream), limit, createWriteStream(filePath));
  } catch (error) {
    await rm(assetDir, { recursive: true, force: true });
    if (error instanceof TooLargeError) return fail(413, "El archivo pesa más de 5 GB");
    return fail(500, "La subida se interrumpió");
  }
  if (limit.bytes() === 0) {
    await rm(assetDir, { recursive: true, force: true });
    return fail(400, "El archivo está vacío");
  }

  await createAssetWithJobs({
    assetId,
    projectId: id,
    kind: mediaKind(fileName, request.headers.get("content-type") ?? ""),
    source,
    originalName: fileName,
    originalPath: relative(resolve(MEDIA_DIR), filePath).replaceAll("\\", "/"),
    sizeBytes: limit.bytes(),
    language,
    transcribe,
  });
  return Response.json({ ok: true, assetId }, { status: 201 });
}
