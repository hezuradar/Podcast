"use client";

import { useEffect, useRef, useState } from "react";
import { saveDocumentAction } from "@/app/actions";
import type { EditDoc } from "@/lib/doc/types";

export type SaveStatus = "saved" | "saving" | "error" | "conflict";

const SAVE_DELAY_MS = 800;

/**
 * Saves the document 800 ms after the last change. Saves run one after another (never in parallel)
 * so each one sends the version the previous one returned; a save from another tab gives "conflict".
 */
export function useAutosave(projectId: string, doc: EditDoc, initialVersion: number): SaveStatus {
  const [savedDoc, setSavedDoc] = useState(doc);
  const [failure, setFailure] = useState<"error" | "conflict" | null>(null);
  const versionRef = useRef(initialVersion);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (doc === savedDoc) return;
    const timer = setTimeout(() => {
      queueRef.current = queueRef.current.then(async () => {
        try {
          const result = await saveDocumentAction(projectId, doc, versionRef.current);
          if (result.ok) {
            versionRef.current = result.docVersion;
            setFailure(null);
            setSavedDoc(doc);
          } else {
            setFailure(result.reason === "conflict" ? "conflict" : "error");
          }
        } catch {
          setFailure("error");
        }
      });
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [doc, savedDoc, projectId]);

  if (failure) return failure;
  return doc === savedDoc ? "saved" : "saving";
}
