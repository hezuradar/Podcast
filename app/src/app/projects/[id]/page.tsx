import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Editor } from "@/components/editor/Editor";
import { Skeleton } from "@/components/ui/feedback";
import { getProject } from "@/lib/data/projects";

async function ProjectEditor({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  // A new transcript (fake upload) remounts the editor so its history starts from the new document.
  return <Editor key={`${project.id}:${project.words[0]?.id ?? "empty"}`} project={project} />;
}

function EditorSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando el proyecto" className="flex h-dvh flex-col">
      <div className="h-(--layout-header-height) border-b border-border bg-surface-raised" />
      <div className="mx-auto flex w-full max-w-(--layout-transcript-max-width) flex-col gap-3 px-4 py-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-11/12" />
      </div>
    </div>
  );
}

export default function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <ProjectEditor params={params} />
    </Suspense>
  );
}
