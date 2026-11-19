import type { Language } from "./media";

type UploadOptions = {
  projectId: string;
  file: Blob;
  fileName: string;
  language: Language;
  source: "upload" | "recording";
  onProgress?: (fraction: number) => void;
};

/** Streams a file to the server with upload progress (fetch has no upload progress, XHR does). */
export function uploadMedia({ projectId, file, fileName, language, source, onProgress }: UploadOptions): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/projects/${encodeURIComponent(projectId)}/assets`);
    xhr.setRequestHeader("x-file-name", encodeURIComponent(fileName));
    xhr.setRequestHeader("x-language", language);
    xhr.setRequestHeader("x-source", source);
    if (file.type) xhr.setRequestHeader("content-type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      let body: { ok?: boolean; assetId?: string; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // keep the generic message below
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.assetId) resolvePromise(body.assetId);
      else reject(new Error(body.error ?? "No se pudo subir el archivo"));
    };
    xhr.onerror = () => reject(new Error("Se perdió la conexión durante la subida"));
    xhr.send(file);
  });
}
