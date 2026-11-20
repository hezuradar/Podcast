import { cancelTranscription } from "@/lib/data/projects";

/** Stops a queued or running transcription. The audio stays in the episode, untranscribed. */
export async function POST(_request: Request, ctx: RouteContext<"/api/jobs/[id]/cancel">): Promise<Response> {
  const { id } = await ctx.params;
  const ok = await cancelTranscription(id);
  if (!ok) return Response.json({ ok: false, error: "Esa transcripción ya terminó o no existe" }, { status: 409 });
  return Response.json({ ok: true });
}
