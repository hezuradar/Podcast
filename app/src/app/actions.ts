"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  attachDemoTranscript,
  createProject,
  deleteProject,
  saveDocument,
  type SaveResult,
} from "@/lib/data/projects";
import type { EditDoc } from "@/lib/doc/types";

const idSchema = z.string().min(1).max(64);

const wordRefSchema = z.object({ k: z.string().min(1).max(80), w: z.string().min(1).max(80), text: z.string().min(1).max(200).optional() });

const blockSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1).max(80),
    type: z.literal("speech"),
    assetId: z.string().min(1).max(80),
    speakerId: z.string().max(80).nullable(),
    words: z.array(wordRefSchema).max(100_000),
  }),
  z.object({ id: z.string().min(1).max(80), type: z.literal("placeholder"), label: z.string().min(1).max(200) }),
]);

const docSchema = z.object({ blocks: z.array(blockSchema).max(10_000) });

const titleSchema = z.string().trim().min(1, "Ponle un título").max(200, "Máximo 200 caracteres");

export async function createProjectAction(formData: FormData): Promise<void> {
  const parsed = titleSchema.safeParse(formData.get("title") || "Proyecto sin título");
  const title = parsed.success ? parsed.data : "Proyecto sin título";
  const project = await createProject(title);
  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export async function deleteProjectAction(id: string): Promise<void> {
  await deleteProject(idSchema.parse(id));
  revalidatePath("/");
}

export async function saveDocumentAction(id: string, doc: EditDoc, expectedVersion: number): Promise<SaveResult> {
  const parsed = z
    .object({ id: idSchema, doc: docSchema, expectedVersion: z.number().int().min(0) })
    .safeParse({ id, doc, expectedVersion });
  if (!parsed.success) return { ok: false, reason: "not_found" };
  const result = await saveDocument(parsed.data.id, parsed.data.doc, parsed.data.expectedVersion);
  if (result.ok) revalidatePath("/");
  return result;
}

/** Fake mode: pretends the uploaded file was transcribed by attaching the demo transcript. */
export async function attachDemoTranscriptAction(id: string): Promise<void> {
  await attachDemoTranscript(idSchema.parse(id));
  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
}
