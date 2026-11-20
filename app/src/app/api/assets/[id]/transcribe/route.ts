import { z } from "zod";
import { queueTranscription } from "@/lib/data/projects";
import { isLanguage } from "@/lib/media";

const bodySchema = z.object({ language: z.string().refine(isLanguage, "Idioma no admitido") });

const MESSAGES = {
  not_found: [404, "Audio no encontrado"],
  not_ready: [409, "El audio todavía se está preparando"],
  already_transcribed: [409, "Este audio ya está transcrito"],
  already_queued: [409, "La transcripción ya está en marcha"],
} as const;

/** Transcribes, on demand, an audio that was added without transcription (or whose transcription was cancelled). */
export async function POST(request: Request, ctx: RouteContext<"/api/assets/[id]/transcribe">): Promise<Response> {
  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "Idioma no admitido" }, { status: 400 });
  const result = await queueTranscription(id, parsed.data.language);
  if (!result.ok) {
    const [status, error] = MESSAGES[result.reason];
    return Response.json({ ok: false, error }, { status });
  }
  return Response.json({ ok: true }, { status: 202 });
}
