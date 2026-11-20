# Bugs

Formato: id, severidad, pasos, esperado, real, evidencia, estado. S1 = pérdida de datos o flujo principal bloqueado; S2 = función rota sin alternativa; S3 = rota con alternativa o visiblemente mal; S4 = estético.

| id | sev | pasos | esperado | real | evidencia | estado |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | S2 | Grabar con el micrófono, «Parar y transcribir» | La grabación se transcribe | El trabajo `transcode` falla: «No se pudo leer la duración del audio». Los WebM de MediaRecorder no guardan la duración | E2E F02; fila en `media_assets` con `status=error` | **corregido**: si el contenedor no trae duración se lee del WAV maestro (`worker/jobs.py`) |
| B2 | S1 | Subir un audio con faster-whisper 1.2.1 recién instalado | Transcripción | `TypeError: open() got an unexpected keyword argument 'metadata_errors'` (PyAV más nuevo que el que espera faster-whisper) | registro del worker | **corregido**: el audio para Whisper lo decodifica ffmpeg (`load_audio_16k`) |
| B3 | S3 | Reiniciar `npm run dev` en Windows | Un solo worker | El proceso hijo de Python seguía vivo y cogía trabajos con código viejo | `Get-CimInstance` mostraba procesos huérfanos | **corregido**: `taskkill /T` en `scripts/run-worker.mjs` |
| B4 | S3 | Un trabajo falla por un error inesperado | Reintentos espaciados | Los 3 intentos se gastaban en milisegundos | registro del worker | **corregido**: espera de 5 s × intento |
| B5 | S3 | Abrir «Exportar» a 390 px | El diálogo encima de todo | La barra de edición fija quedaba por encima | captura `replica/clone-screens/S11-mobile.jpg` | **corregido**: capas `z-50` en diálogos, menús y popovers |
| B6 | S4 | Panel lateral en móvil | Ocupa el ancho disponible | Se quedaba en 320 px | captura | **corregido** |
| B7 | S1 | `.gitignore` con `data/` | Solo se ignora la carpeta de datos | También ignoraba `app/src/lib/data/` (la capa de datos no entraba en git) | `git ls-files` | **corregido**: `/data/` |

Abiertos: ninguno S1/S2.

## Por comprobar

- Reproducción de archivos de más de 1 hora: el audio ligero se decodifica entero en el navegador (unos 350 MB de memoria por hora); puede ir lento en equipos con poca RAM.
- Firefox y Safari: solo se ha probado Chromium.
