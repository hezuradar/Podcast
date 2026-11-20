# Backend

Fecha: 2026-11-19. Todo en local: no hay cuentas, claves ni servicios externos que crear.

## Qué hay

| pieza | dónde | estado |
| --- | --- | --- |
| Base de datos SQLite (`node:sqlite`, WAL) | `app/src/lib/data/db.ts`, migraciones en `app/db/migrations/` | hecho |
| Capa de datos (proyectos, documento con versión, audios, trabajos, exportaciones) | `app/src/lib/data/projects.ts` | hecho |
| Subida en streaming al disco, límite 5 GB, idioma | `POST /api/projects/[id]/assets` | hecho |
| Estado de los trabajos | `GET /api/projects/[id]/jobs` | hecho |
| Audio ligero para reproducir | `GET /api/assets/[id]/proxy` | hecho |
| Exportar MP3/WAV (la lista de cortes se rehace en el servidor) | `POST /api/projects/[id]/exports`, `GET /api/exports/[id]`, `/download` | hecho |
| Worker Python: `transcode`, `transcribe` (faster-whisper `small`, CPU int8), `render` (ffmpeg) | `worker/` | hecho |
| Reproducción real con Web Audio | `app/src/lib/audio/player.ts` | hecho |
| Grabación con el micrófono (MediaRecorder, se sube al parar) | `app/src/components/editor/useRecorder.ts` | hecho |
| Detección de hablantes (sherpa-onnx) | — | pendiente: todas las palabras van a "Voz 1" |
| Mejora de voz: cadena de ffmpeg (ruido, puerta, ecualización, de-esser, compresor, −16 LUFS), intensidad 0–100, A/B con el original | `worker/media.py` (`enhance_chain`), trabajo `enhance`, panel `EnhancePanel` | hecho; medido: SNR 18 → 33,5 dB a 70 |
| Biblioteca de música, audiogramas, vídeo | — | pendiente |

Cambios respecto a la arquitectura:
- El worker funciona con el **Python 3.14** del sistema (faster-whisper 1.2.1 y ctranslate2 4.9.0 ya tienen versiones para 3.14), sin `uv` ni Python 3.12.
- El audio para Whisper lo decodifica **ffmpeg** (16 kHz, float32) en vez de PyAV: la versión de PyAV que se instala con faster-whisper 1.2.1 rompe su decodificador (`metadata_errors`).

## Arranque

```
py -m venv worker/.venv
worker/.venv/Scripts/python -m pip install -r worker/requirements.txt
cd app && npm install && npm run dev      # web + worker juntos
```

La primera transcripción descarga el modelo `small` de Whisper (~480 MB) a la caché de Hugging Face. `WHISPER_MODEL=base` lo hace más rápido y menos preciso; `medium`, al revés.

## Lista de seguridad

- [x] Sin secretos: no hay claves ni `.env` necesarios; `.env*` está en `.gitignore`.
- [x] Entradas validadas en el servidor: zod en acciones y exportación; cabeceras de subida con lista blanca (extensión, idioma, origen); ids comprobados.
- [x] Rutas de archivo: nunca salen del nombre que da el usuario; se construyen con UUID propios y se comprueba que quedan dentro de `data/media` (Node y Python).
- [x] Comandos externos (ffmpeg, ffprobe) con lista de argumentos, nunca a través de un shell; el filtro de ffmpeg va en un archivo temporal (sin límite de longitud de línea en Windows).
- [x] Subidas: tamaño máximo 5 GB contado en el flujo, tipo comprobado por extensión y después por ffprobe (sin pista de audio = error claro).
- [x] Autorización: un solo usuario; el servidor de desarrollo escucha en tu equipo. No exponerlo a internet sin añadir autenticación (anotado en `schema.sql`).
- [x] Sin datos personales en URLs ni en los registros (los registros del worker solo llevan ids).
- [x] `npm audit`: 0 vulnerabilidades al instalar.
- [ ] Política de privacidad: no aplica (los datos no salen del equipo).
