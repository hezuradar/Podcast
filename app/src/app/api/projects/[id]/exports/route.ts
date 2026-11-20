import { z } from "zod";
import { createExport, getProject } from "@/lib/data/projects";
import { buildEdl } from "@/lib/edl/edl";
import { isEnhanceReady } from "@/lib/enhance";

const bodySchema = z.object({ kind: z.enum(["audio_mp3", "audio_wav"]) });

/**
 * Queues an audio export of the saved document. The edit decision list is rebuilt here from the
 * stored document and words, so the render never trusts timings sent by the browser. With voice
 * enhancement on, the export uses the enhanced audio and waits until it is ready.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/projects/[id]/exports">): Promise<Response> {
  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "Formato no válido" }, { status: 400 });

  const project = await getProject(id);
  if (!project) return Response.json({ ok: false, error: "Proyecto no encontrado" }, { status: 404 });
  if (project.enhance.enabled && !isEnhanceReady(project)) {
    return Response.json({ ok: false, error: "La mejora de voz todavía se está aplicando. Espera a que termine." }, { status: 409 });
  }

  const durations = new Map(project.assets.flatMap((asset) => (asset.durationMs ? [[asset.id, asset.durationMs] as const] : [])));
  const edl = buildEdl(project.doc, new Map(project.words.map((word) => [word.id, word])), durations);
  if (edl.segments.length === 0) return Response.json({ ok: false, error: "El episodio está vacío" }, { status: 400 });

  const segments = edl.segments.map(({ assetId, inMs, outMs }) => ({ assetId, inMs, outMs }));
  const exportId = await createExport(id, parsed.data.kind, project.docVersion, segments, project.enhance);
  return Response.json({ ok: true, exportId }, { status: 201 });
}
