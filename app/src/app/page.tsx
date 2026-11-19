import { Suspense } from "react";
import { connection } from "next/server";
import { FileAudio, Plus } from "lucide-react";
import { createProjectAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { listProjects } from "@/lib/data/projects";
import { formatDuration, formatRelative } from "@/lib/format";

/** Per-request data: rendered at request time inside Suspense (Cache Components). */
async function ProjectList() {
  await connection();
  const projects = await listProjects();
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FileAudio}
        title="Todavía no hay proyectos"
        description="Escribe un título arriba y pulsa «Nuevo proyecto». Después podrás subir un audio."
      />
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <li key={project.id}>
          <ProjectCard
            id={project.id}
            href={`/projects/${project.id}`}
            title={project.title}
            updated={formatRelative(project.updatedAt)}
            duration={formatDuration(project.durationMs)}
          />
        </li>
      ))}
    </ul>
  );
}

function ProjectListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando proyectos" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((n) => (
        <Skeleton key={n} className="h-32 rounded-lg" />
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-6 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">Editor de podcasts</p>
          <h1 className="text-xl">Tus episodios</h1>
          <p className="max-w-md text-sm text-text-muted">Edita el audio como si fuera un documento: borra una frase y desaparece del episodio.</p>
        </div>
        <form action={createProjectAction} className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
          <label htmlFor="new-title" className="sr-only">
            Título del nuevo proyecto
          </label>
          <input
            id="new-title"
            name="title"
            maxLength={200}
            placeholder="Título del episodio"
            className="focus-ring h-10 min-w-0 grow rounded-md border border-border-input bg-bg px-3 text-sm md:w-64"
          />
          <Button type="submit" leadingIcon={<Plus aria-hidden className="size-4" />}>
            Nuevo proyecto
          </Button>
        </form>
      </header>

      <Suspense fallback={<ProjectListSkeleton />}>
        <ProjectList />
      </Suspense>
    </main>
  );
}
