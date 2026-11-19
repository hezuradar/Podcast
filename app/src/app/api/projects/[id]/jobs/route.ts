import { connection } from "next/server";
import { listActiveJobs } from "@/lib/data/projects";

/** Active and failed jobs of a project, polled by the editor while something is processing. */
export async function GET(_request: Request, ctx: RouteContext<"/api/projects/[id]/jobs">): Promise<Response> {
  await connection();
  const { id } = await ctx.params;
  return Response.json({ ok: true, jobs: await listActiveJobs(id) }, { headers: { "cache-control": "no-store" } });
}
