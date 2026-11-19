/** Upload rules shared by the browser (early feedback) and the server (the real check). */

export const MAX_UPLOAD_BYTES = 5 * 1024 ** 3;

export const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "fr", label: "Francés" },
  { value: "de", label: "Alemán" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Portugués" },
] as const;

export type Language = (typeof LANGUAGES)[number]["value"];

export function isLanguage(value: string | null): value is Language {
  return LANGUAGES.some((language) => language.value === value);
}

const AUDIO_EXTENSIONS = ["mp3", "wav", "m4a", "aac", "flac", "ogg", "opus", "webm"] as const;
const VIDEO_EXTENSIONS = ["mp4", "mov", "m4v", "3gp"] as const;

/** Lower-case extension if it is an accepted media type, else null. */
export function mediaExtension(fileName: string): string | null {
  const match = /\.([a-z0-9]{2,5})$/i.exec(fileName);
  const ext = match?.[1].toLowerCase() ?? "";
  return [...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS].includes(ext as never) ? ext : null;
}

export function mediaKind(fileName: string, mimeType: string): "audio" | "video" {
  const ext = mediaExtension(fileName) ?? "";
  return mimeType.startsWith("video/") || (VIDEO_EXTENSIONS as readonly string[]).includes(ext) ? "video" : "audio";
}

/** Returns an error message, or null when the file can be uploaded. */
export function validateMediaFile(file: { name: string; type: string; size: number }): string | null {
  const isMedia = /^(audio|video)\//.test(file.type) || mediaExtension(file.name) !== null;
  if (!isMedia || mediaExtension(file.name) === null) return `«${file.name}» no es un audio ni un vídeo admitido.`;
  if (file.size > MAX_UPLOAD_BYTES) return `«${file.name}» pesa más de 5 GB.`;
  if (file.size === 0) return `«${file.name}» está vacío.`;
  return null;
}
