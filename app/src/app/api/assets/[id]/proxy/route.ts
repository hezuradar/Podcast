import { connection } from "next/server";
import { getAssetFile } from "@/lib/data/projects";
import { fileResponse } from "@/lib/data/files";

/** Light playback copy (24 kHz mono WAV) made by the worker's transcode job. */
export async function GET(_request: Request, ctx: RouteContext<"/api/assets/[id]/proxy">): Promise<Response> {
  await connection();
  const { id } = await ctx.params;
  const asset = await getAssetFile(id);
  if (!asset?.proxyPath) return Response.json({ ok: false, error: "Audio todavía no disponible" }, { status: 404 });
  return fileResponse(asset.proxyPath, "audio/wav");
}
