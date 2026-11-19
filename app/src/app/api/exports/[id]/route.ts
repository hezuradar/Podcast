import { connection } from "next/server";
import { getExport } from "@/lib/data/projects";

export async function GET(_request: Request, ctx: RouteContext<"/api/exports/[id]">): Promise<Response> {
  await connection();
  const { id } = await ctx.params;
  const record = await getExport(id);
  if (!record) return Response.json({ ok: false, error: "Exportación no encontrada" }, { status: 404 });
  return Response.json({ ok: true, status: record.status, error: record.error }, { headers: { "cache-control": "no-store" } });
}
