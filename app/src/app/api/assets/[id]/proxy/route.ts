import { connection } from "next/server";
import { getAssetFile } from "@/lib/data/projects";
import { fileResponse } from "@/lib/data/files";

/**
 * Light playback copy (24 kHz mono WAV) made by the worker. `?enhanced=1` returns the copy of the
 * voice-enhanced audio, so the editor can switch between original and enhanced to compare.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/assets/[id]/proxy">): Promise<Response> {
  await connection();
  const { id } = await ctx.params;
  const asset = await getAssetFile(id);
  const wantsEnhanced = new URL(request.url).searchParams.get("enhanced") === "1";
  const path = wantsEnhanced ? asset?.enhancedProxyPath : asset?.proxyPath;
  if (!path) return Response.json({ ok: false, error: "Audio todavía no disponible" }, { status: 404 });
  return fileResponse(path, "audio/wav");
}
