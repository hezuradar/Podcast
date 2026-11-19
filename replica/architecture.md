# Arquitectura: clon personal de un editor de podcasts por texto (reconstrucción de las funciones de Adobe Podcast Studio)

Fecha: 2026-11-19. Lee `recon.md` y `features.csv`.

## Decisión principal: todo en local

Es un proyecto personal. Todo funciona en tu propio PC, así que no hay cuentas en la nube, ni costes por minuto, ni audio que salga de tu equipo. El equipo tiene Node 24, ffmpeg 9 y Python 3.14. No tiene GPU NVIDIA ni Docker, de modo que la IA funciona en CPU con modelos abiertos. Es más lento que Adobe, pero gratis.

Hay dos procesos que comparten una base de datos y una carpeta de ficheros:

```
navegador ──HTTP──> Next.js (UI + API, 127.0.0.1:3000) ──escribe trabajos──> SQLite (data/app.db)
                                                                                  ▲
                         worker Python (cola de trabajos: ffmpeg, Whisper, etc.) ─┘
                                        │
                                        └──> data/media/<project>/...  (originales, WAV, proxies, exportaciones)
```

## Tecnología

| capa | elección | por qué |
| --- | --- | --- |
| web | Next.js (App Router) + TypeScript | La interfaz y la API viven en un mismo proyecto, y Node ya está instalado. |
| estilos | Tailwind, con los tokens de `/replica-design` | Es la opción por defecto del paquete y evita valores sueltos en los componentes. |
| editor de texto | TipTap (ProseMirror) con un nodo de palabra propio | Cortar, pegar, deshacer y la selección ya están resueltos. Cada palabra lleva su id y sus tiempos como atributos. |
| audio en el navegador | Web Audio API con un planificador propio | Reproduce la lista de decisiones de edición sin huecos entre cortes, cosa que `<audio>` con saltos no consigue. |
| grabación | `getUserMedia` + `MediaRecorder` (WebM/Opus), trozos de 5 s | Cada trozo se sube según se graba, así que si se cierra la pestaña se conserva lo grabado. |
| base de datos | SQLite en `data/app.db`, en modo WAL | Es un fichero sin servidor, y Node y Python pueden usarlo a la vez. |
| ORM | Drizzle (better-sqlite3) en Node; `sqlite3` estándar en Python | Drizzle tiene tipos y es ligero. El worker solo necesita unas pocas consultas. |
| autenticación | ninguna; el servidor solo escucha en 127.0.0.1 | Hay un solo usuario en su propio PC. Si algún día se publica, se añaden Auth.js y una columna `user_id` (indicado en `schema.sql`). |
| pagos / email | ninguno | Es un proyecto personal. |
| trabajos | un worker Python que consulta la tabla `jobs` cada segundo | Sin Redis ni colas externas. Reintenta y libera los bloqueos que quedan colgados. |
| transcripción | faster-whisper (modelo `small` por defecto; `medium` opcional), con tiempos por palabra | Es abierto (MIT), funciona bien en CPU y soporta los 6 idiomas. |
| hablantes | sherpa-onnx (segmentación de pyannote + embeddings), en CPU con ONNX | No requiere PyTorch ni token de Hugging Face. **Pendiente: verificar la licencia de cada modelo antes de usarlo.** |
| mejora de voz | DeepFilterNet 3 (binario `deep-filter`) | Abierto (MIT/Apache) y en tiempo real en CPU. Su límite de atenuación (`--atten-lim`) hace de deslizador de intensidad. |
| audio y render | ffmpeg 9 (ya instalado) | Convierte formatos, genera proxies y exporta (`atrim`, `concat`, `afade`, `sidechaincompress` para el ducking). |
| ficheros | `data/media/<project_id>/` en disco | Es local. Los ficheros se escriben primero con nombre temporal y luego se renombran. |
| Python | entorno con `uv` y **Python 3.12**, no el 3.14 del sistema | Los paquetes de audio y ONNX suelen ir por detrás de la última versión de Python. |
| arranque | `npm run dev` lanza Next y el worker juntos (con `concurrently`) | Un solo comando. |

Estructura del repositorio:

```
app/          Next.js (src/app, src/components, src/lib/db, src/lib/edl)
worker/       Python: main.py (bucle), jobs/transcode.py, transcribe.py, diarize.py, enhance.py, render.py
data/         base de datos y media (en .gitignore)
replica/      planificación (este fichero)
```

## Esquema

9 tablas: `projects`, `media_assets`, `recording_chunks`, `speakers`, `transcripts`, `words`, `music_tracks`, `jobs`, `exports`. El SQL completo está en [`schema.sql`](schema.sql). Lo he cargado en SQLite 3.50 y funciona: los borrados en cascada están probados, igual que el bloqueo de trabajos duplicados.

Control de acceso: no hace falta porque hay un solo usuario en localhost. Lo que sí se hace es validar en el servidor cada entrada con zod y comprobar que cada id pertenece al proyecto de la ruta.

### El documento de edición (`projects.doc_json`)

Es la pieza central. Las palabras que devuelve Whisper (tabla `words`) no se modifican nunca. Lo que el usuario edita es un documento con este formato:

```json
{
  "blocks": [
    { "id": "b1", "type": "music", "trackId": "m1", "inMs": 0, "outMs": 12000,
      "fadeInMs": 500, "fadeOutMs": 2000, "underNext": true },
    { "id": "b2", "type": "speech", "assetId": "a1", "speakerId": "s1",
      "words": [ { "w": "w-uuid-1" }, { "w": "w-uuid-2", "text": "Oñati" } ] },
    { "id": "b3", "type": "placeholder", "label": "Entrevista" }
  ]
}
```

- **Borrar texto** quita las referencias del documento; el audio original no se toca.
- **Cortar y pegar** mueve referencias, que conservan su `assetId` y sus tiempos.
- **Corregir una palabra** añade `text` a la referencia, sin cambiar los tiempos.
- **Deshacer y rehacer** usan el historial de TipTap. Se guarda solo (unos 800 ms después del último cambio) con `doc_version` para no pisar los cambios de otra pestaña.
- **La lista de decisiones de edición** se calcula del documento: las palabras seguidas del mismo audio se juntan en un rango `[asset, inMs, outMs]`. Esa misma función (`src/lib/edl`) la usan el reproductor y el render. El render recibe la lista ya calculada en el `payload` del trabajo, así que la exportación suena igual que lo que oyes en el editor.

## API

Rutas de Next.js (`app/src/app/api/...`). Todas son locales, y las entradas se validan con zod.

| método y ruta | qué hace | quién | entrada | salida | flujo |
| --- | --- | --- | --- | --- | --- |
| `GET /api/projects` | lista de proyectos, los más recientes primero | local | — | `[{id,title,updated_at,duration_ms}]` | F01 |
| `POST /api/projects` | crear un proyecto | local | `{title?}` | proyecto | F01, F02 |
| `GET /api/projects/:id` | proyecto con documento, audios, hablantes y trabajos activos | local | — | proyecto completo | todos |
| `PATCH /api/projects/:id` | guardar título, documento o filtros | local | `{title?, doc?, docVersion, enhance?}` | `{docVersion}` o 409 | F03-F06, F08 |
| `DELETE /api/projects/:id` | borrar el proyecto y su carpeta de media | local | — | 204 | — |
| `POST /api/projects/:id/assets` | subir un fichero (en streaming al disco) y encolar `transcode` | local | multipart | asset | F01 |
| `POST /api/projects/:id/recordings` | empezar una grabación | local | `{mimeType}` | `{assetId}` | F02 |
| `PUT /api/recordings/:assetId/chunks/:seq` | subir un trozo de la grabación (idempotente) | local | binario | 204 | F02 |
| `POST /api/recordings/:assetId/finish` | cerrar la grabación, unir los trozos y encolar `transcode` + `transcribe` | local | `{language}` | asset | F02 |
| `POST /api/assets/:id/transcribe` | encolar la transcripción (y la detección de hablantes) | local | `{language, detectSpeakers}` | trabajo | F01 |
| `GET /api/assets/:id/transcript` | palabras con tiempos y hablante | local | — | `{words[]}` | F01-F04 |
| `GET /api/assets/:id/proxy/:n` | trozo `n` del proxy Opus (o de la versión mejorada) | local | `?enhanced=1` | audio | reproducción |
| `PATCH /api/speakers/:id` | renombrar un hablante | local | `{label}` | hablante | — |
| `GET /api/projects/:id/jobs` | estado y progreso de los trabajos (consulta cada 1 s mientras haya alguno activo) | local | — | `[job]` | todos |
| `GET /api/music` / `POST /api/music` | biblioteca propia: listar y subir (con licencia obligatoria) | local | multipart + `{title,category,license}` | pista | F05 |
| `GET /api/music/:id/audio` | escuchar una pista de la biblioteca | local | — | audio | F05 |
| `POST /api/projects/:id/exports` | encolar una exportación de la versión actual del documento | local | `{kind, rangeStartMs?, rangeEndMs?}` | export | F07 |
| `GET /api/exports/:id/download` | descargar el fichero exportado | local | — | fichero | F07 |

18 rutas. Webhooks: ninguno, ni de entrada ni de salida. No se usa ninguna API de Adobe.

### Trabajos (worker Python)

| trabajo | se lanza al | qué hace |
| --- | --- | --- |
| `transcode` | subir un fichero o terminar una grabación | ffprobe; genera el WAV maestro a 48 kHz y los trozos de proxy en Opus a 24 kHz mono de 30 s; en vídeo, además, una versión ligera para la vista previa |
| `transcribe` | pedirlo, o al terminar una grabación | faster-whisper con tiempos por palabra; escribe `transcripts` y `words` en una transacción y añade un bloque de voz al documento |
| `diarize` | después de `transcribe`, si se marcó "Detect speakers" | sherpa-onnx; crea `speakers` y asigna `words.speaker_id` |
| `enhance` | activar el filtro o cambiar la intensidad (con 1 s de espera) | `deep-filter` sobre el WAV maestro y regenera los proxies mejorados |
| `render` | exportar | aplica la lista de decisiones con ffmpeg: recortes con fundidos de 10 ms para evitar chasquidos, música con fundidos y ducking, y codifica a MP3, WAV o MP4; las transcripciones se exportan a TXT, PDF o DOCX |

Al arrancar, el worker devuelve a la cola los trabajos `running` que lleven más de 10 minutos bloqueados. Cada trabajo se reintenta hasta 3 veces.

## Lo que puede dar problemas

- **Tiempos de las palabras:** Whisper se desvía entre 50 y 200 ms. Al cortar se añaden 40 ms de margen, se busca el silencio más cercano y se aplica un fundido de 10 ms. Sin esto, se oyen chasquidos y sílabas cortadas.
- **Velocidad en CPU:** `small` tarda aproximadamente lo que dura el audio, y `medium` entre 2 y 3 veces más. Hay que mostrar el progreso y avisar antes de transcribir audios largos.
- **Memoria en el navegador:** una hora decodificada a 48 kHz estéreo ocupa unos 1,4 GB. Por eso el reproductor solo decodifica los trozos de 30 s que va a necesitar, a partir del proxy de 24 kHz mono.
- **Ficheros grandes (hasta 5 GB de vídeo):** se suben en streaming al disco, sin cargar el fichero entero en memoria, y se ajusta el límite de tamaño de Next.js. Se comprueban el tamaño y el tipo real con ffprobe, no la extensión.
- **Concurrencia en SQLite:** se usa WAL con `busy_timeout` de 5 s y transacciones cortas. Solo el worker escribe `words`.
- **Trabajos duplicados:** un índice único parcial impide tener dos trabajos activos del mismo tipo sobre el mismo audio. Los trozos de grabación tienen clave `(asset_id, seq)`, así que reenviar uno no hace nada.
- **Dos pestañas abiertas:** `doc_version` hace que el segundo guardado reciba un 409 y recargue.
- **Grabación:** MediaRecorder graba en WebM/Opus, no en WAV. El worker lo convierte después a WAV a 48 kHz. Hay que gestionar el permiso de micrófono denegado y la falta de micrófono.
- **Rutas en Windows:** se pasan a ffmpeg como argumentos, nunca componiendo un comando de shell, y siempre relativas a `data/`.
- **Disco:** al borrar un proyecto se borra su carpeta. Las exportaciones de más de 7 días se pueden limpiar.
- **Licencias:** faster-whisper y los modelos de Whisper son MIT; DeepFilterNet, MIT/Apache; sherpa-onnx, Apache. Hay que verificar la licencia de los modelos de segmentación de hablantes. La música de la biblioteca debe ser propia o CC0, y se guarda su licencia.
- **No aplica:** zonas horarias (todo se guarda en UTC), pagos, email, multiusuario, RGPD (los datos no salen del equipo) y límites de peticiones.

## Orden de construcción

1. **Primera versión completa, aunque fea** (confirma que la tecnología elegida funciona de principio a fin)
   - Pantallas: S01 mínima, S02 (subir), S04 (Transcribe con el idioma fijo en `es`), S05 (ver el texto, borrar palabras, reproducir), S11 (exportar a MP3).
   - Tablas: `projects`, `media_assets`, `transcripts`, `words`, `jobs`, `exports`.
   - Rutas: projects (GET, POST, GET :id, PATCH), assets (POST), transcribe, transcript, proxy, jobs, exports (POST), download.
   - Trabajos: `transcode`, `transcribe`, `render` (MP3).
   - Prueba de que funciona: subir 5 minutos de audio, borrar tres frases y exportar. El MP3 no debe contener esas frases ni tener chasquidos.
2. **Imprescindibles** (14 filas de `features.csv`)
   - Editor: clic en una palabra para saltar a ese punto, palabra resaltada durante la reproducción, cortar y pegar, deshacer y rehacer, corregir con el lápiz (S06), guardado automático con `doc_version`.
   - Grabación S03: trozos, `recording_chunks`, rutas de grabación, estados del micrófono.
   - Selector de idioma en S04, exportación a WAV, lista de proyectos completa en S01 (estado vacío, borrar).
3. **Importantes** (11 filas)
   - Hablantes (`diarize`, `speakers`, renombrar); filtros S09 (`enhance`, deslizador).
   - Música S07 y S08 (`music_tracks`, subida, fundidos, ducking en el render); placeholders S10 (bloques que se arrastran y grabar encima).
   - Exportar la transcripción a TXT, PDF o DOCX; buscar en el texto; ficheros multipista.
4. **Opcionales:** vídeo S13 (proxy de vídeo, exportar MP4), exportar un clip de un rango, pistas originales por hablante, audiogramas y subtítulos S12, mejora de voz como herramienta suelta.
5. **Mejoras de `/replica-entrepreneur`**, cuando se ejecute. Ideas a comprobar con reseñas reales: sin límite de 30 minutos ni de proyectos al día, y deslizador de intensidad para todos.
