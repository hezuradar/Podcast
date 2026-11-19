import { connection } from "next/server";
import { getExport, getProject } from "@/lib/data/projects";
import { fileResponse } from "@/lib/data/files";

const TYPES = { audio_mp3: ["audio/mpeg", "mp3"], audio_wav: ["audio/wav", "wav"] } as const;

export async function GET(_request: Request, ctx: RouteContext<"/api/exports/[id]/download">): Promise<Response> {
  await connection();
  const { id } = await ctx.params;
  const record = await getExport(id);
  if (!record?.outputPath || record.status !== "ready") {
    return Response.json({ ok: false, error: "La exportación no está lista" }, { status: 404 });
  }
  const project = await getProject(record.projectId);
  const [contentType, extension] = TYPES[record.kind];
  const base = (project?.title ?? "episodio").replace(/[^\p{L}\p{N} _-]+/gu, "").trim() || "episodio";
  return fileResponse(record.outputPath, contentType, `${base}.${extension}`);
}
