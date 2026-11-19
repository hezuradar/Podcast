# Recon map: Adobe Podcast Studio (web)

Alcance: Studio, el editor de proyectos de Adobe Podcast. Incluye subir o grabar audio y vídeo, la transcripción automática, editar el audio editando el texto, la música, los filtros de mejora de voz y la exportación. Quedan fuera la grabación remota con invitados, Mic Check y Enhance Speech como herramienta independiente.
Para: proyecto personal, sin intención de venderlo.
Fecha: 2026-11-19

> **Método.** Solo fuentes públicas. Los términos de uso de Adobe (sección 17) prohíben "recrear o intentar recrear" sus productos y vigilar las entradas y salidas del servicio. Por eso no se ha abierto el proyecto del usuario ni su cuenta, y no hay capturas de la app en `replica/screens/`. Las pantallas se han deducido de la documentación y de guías públicas. Donde la confianza es baja, se indica.

## Fuentes

| # | fuente | URL | notas |
| --- | --- | --- | --- |
| 1 | guía oficial: editar por texto | https://podcast.adobe.com/en/guides/a-beginners-guide-to-text-based-editing | flujo New Project → grabar/subir → transcripción → editar el texto |
| 2 | guía oficial: grabar un podcast | https://podcast.adobe.com/guides/how-to-record-a-podcast-with-adobe-podcast | menú Tools, grabación, invitados, panel de música, filtros |
| 3 | guía oficial: editar vídeo en Studio | https://podcast.adobe.com/en/guides/edit-videos-in-adobe-podcast-studio | límites de vídeo, idiomas, Transcribe, lápiz, opciones de exportación |
| 4 | FAQ oficial | https://helpx.adobe.com/podcast/adobe-podcast-faq.html | devolvió 403 al leerla; los datos de la FAQ vienen citados en el resumen de búsqueda |
| 5 | reseña de un usuario | https://dahlnews.substack.com/p/using-adobe-podcast-studio | lista de proyectos, placeholders, opciones de pista, límites del plan gratuito |
| 6 | reseña de precios | https://techpilot.ai/tools/adobe-podcast/ | gratuito frente a Firefly Pro, a fecha de 2026-11-05 |
| 7 | términos de uso de Adobe | https://www.adobe.com/legal/terms.html | sección 17: prohíbe recrear sus productos |

No se han usado: la cuenta del usuario, el código de la app ni sus llamadas de red.

## Bucle principal

Subir o grabar una voz, obtener la transcripción, limpiar el episodio borrando y moviendo texto, mejorar el sonido y exportar el audio final.

## Pantallas

| ID | pantalla | ruta / cómo se llega | propósito | componentes clave | estados vistos |
| --- | --- | --- | --- | --- | --- |
| S01 | Inicio de Studio | menú Tools → Studio | lista de proyectos y crear uno nuevo | barra superior, botón New Project, lista de proyectos recientes | vacío (supuesto), con proyectos |
| S02 | Editor: proyecto vacío | New Project | empezar a construir el episodio | menú izquierdo (Add, Music, Placeholder, Filters), botón rojo de grabar abajo, zona para soltar archivos | vacío |
| S03 | Editor: grabando | botón rojo en S02/S05 | grabar la voz directamente en el navegador | grabar, pausar, reanudar, parar, contador, vúmetro (supuesto) | permiso de micrófono pedido, grabando, en pausa, transcribiendo al parar |
| S04 | Diálogo de transcripción | archivo subido → menú del clip (icono de deslizadores) → Transcribe | transcribir audio o vídeo subido | selector de idioma (EN, FR, DE, IT, PT, ES), casilla Detect speakers | por defecto, procesando, error (supuesto) |
| S05 | Editor: transcripción (pantalla principal) | después de grabar o transcribir | editar el audio editando el texto | bloques de transcripción por clip y hablante, cursor de reproducción ligado a las palabras, barra de herramientas con lápiz, transporte de reproducción | rellena, palabra seleccionada, rango seleccionado, reproduciendo |
| S06 | Corregir transcripción | seleccionar una palabra → lápiz (antes "Correct transcript") | corregir el texto sin tocar el audio | edición en línea, guardar o cancelar | editando |
| S07 | Panel de música | menú izquierdo → Music | añadir intros, outros, transiciones y fondos | categorías, vista previa, botón "+", subir música propia | navegando, reproduciendo la vista previa |
| S08 | Menú de opciones de pista | icono arriba a la derecha de un clip de música | ajustar cómo suena la música | fundido de entrada y salida, "sonar bajo la siguiente voz" | cerrado, abierto |
| S09 | Panel de filtros | menú izquierdo → Filters | mejorar la voz | interruptor de Enhance Speech, deslizador de intensidad (de pago), otros filtros (confianza baja) | activado, desactivado, intensidad fija en el plan gratuito |
| S10 | Placeholder | menú izquierdo → Placeholder | estructurar el episodio antes de grabar | bloque de placeholder, asa para arrastrar al pasar el ratón, borrar, grabar encima | vacío, movido, sustituido por una grabación |
| S11 | Diálogo de exportación | botón Export arriba en el centro | sacar el resultado | audio (MP3, WAV), vídeo, transcripción (TXT, PDF, DOCX), audiograma, clip corto | elegir opción, renderizando, descarga lista, aviso de límite del plan gratuito |
| S12 | Editor de audiogramas y subtítulos | Export → audiograma, o un clip | piezas visuales para redes sociales | temas, fondo personalizado, estilo de subtítulos, selección de rango | confianza baja |
| S13 | Editor: proyecto de vídeo | subir mp4, mov, m4v, 3gpp o webm | editar vídeo por texto | vista previa del vídeo y transcripción | límite de 5 GB y 2 horas, error de formato (supuesto) |

## Flujos

```
F01 Crear un episodio subiendo audio
    S01 → S02 (soltar archivo) → S04 → S05 → S11
    clics del camino feliz: unos 7 (New Project, Add, elegir archivo, Transcribe, confirmar, Export, MP3)
    edge: archivo de más de 5 GB o de más de 2 horas, formato no admitido, sin voz o idioma
          no admitido, se cierra la pestaña mientras transcribe, se alcanza el límite diario

F02 Grabar en el navegador
    S01 → S02 → S03 → S05
    clics del camino feliz: unos 4 (New Project, grabar, permitir micrófono, parar)
    edge: permiso de micrófono denegado, sin micrófono, se cae la red mientras graba (Adobe sube en
          tiempo real), cambiar de micrófono, grabar encima de un placeholder

F03 Limpiar el episodio editando el texto
    S05 (seleccionar texto → suprimir / cortar → pegar) → reproducir para comprobar
    clics del camino feliz: 2 por corte
    edge: borrar a mitad de palabra, deshacer y rehacer, pegar en otro clip, transcripción con
          errores de tiempos, la "palabra clave antes de repetir una toma" (buscar y borrar hasta ahí)

F04 Corregir una palabra mal transcrita
    S05 → S06
    clics: 3
    edge: nombres propios, mayúsculas, corregir no debe mover el audio

F05 Añadir música de intro
    S05 → S07 (+) → S08 (fundido, sonar bajo la siguiente voz)
    clics: unos 4
    edge: música más larga que la voz, música propia subida, volumen relativo

F06 Mejorar la voz
    S05 → S09 (activar, ajustar intensidad)
    clics: 2
    edge: procesando, se pierde el ambiente de la sala con intensidad máxima, plan gratuito sin deslizador

F07 Exportar
    S05 → S11 → descarga
    clics: 3
    edge: proyecto de más de 30 minutos en el plan gratuito, exportar solo un rango, exportar la
          transcripción, exportar las pistas por hablante

F08 Estructurar con placeholders
    S02 → S10 (añadir, arrastrar) → S03 (grabar encima)
    clics: unos 3 por bloque
```

## Componentes

| componente | variantes | estados | se usa en |
| --- | --- | --- | --- |
| Button | primario (Export, New Project), secundario, fantasma, icono | normal, hover, foco, desactivado, cargando | todas |
| Botón de grabar | grande y rojo, en la barra inferior | listo, grabando, en pausa, desactivado (sin micrófono) | S02, S03, S10 |
| Menú lateral de herramientas | Add, Music, Placeholder, Filters | normal, activo | S02, S05 |
| Bloque de transcripción | voz, música, placeholder | normal, seleccionado, reproduciendo, transcribiendo, arrastrando | S05, S10 |
| Token de palabra | — | normal, bajo el cursor de reproducción, seleccionada, editando | S05, S06 |
| Transporte | reproducir/pausar, tiempo, saltar | reproduciendo, en pausa | S05, S13 |
| Panel lateral | Music, Filters | abierto, cerrado | S07, S09 |
| Interruptor | — | activado, desactivado | S09 |
| Deslizador | intensidad | normal, bloqueado (plan gratuito) | S09 |
| Menú contextual | opciones de clip, opciones de pista | abierto, cerrado | S04, S08 |
| Modal | Transcribe, Export | abierto, procesando, error | S04, S11 |
| Tarjeta de proyecto | — | normal, hover | S01 |
| Zona para soltar archivos | — | inactiva, arrastrando encima, subiendo, error | S02 |
| Toast / aviso | info, error, límite del plan | visible | todas |

## Modelo de datos deducido

```
User        id, email, plan (free | premium), uso_diario
            evidencia: límites diarios del plan gratuito (fuentes 5 y 6)
            confianza: alta

Project     id, user_id, title, created_at, updated_at, duration_ms
            evidencia: lista de proyectos (S01), New Project
            confianza: alta

MediaAsset  id, project_id, kind (audio | video), source (recording | upload | music_library | user_music),
            storage_url, duration_ms, sample_rate, size_bytes
            evidencia: grabación en WAV a 48 kHz por participante, límites de subida (fuentes 2 y 3)
            confianza: alta

Clip        id, project_id, media_asset_id (null si es placeholder), type (speech | music | placeholder),
            position, in_ms, out_ms, options (json: fade_in, fade_out, play_under_next)
            evidencia: bloques reordenables, opciones de pista de música (S08), placeholders (S10)
            confianza: media

Transcript  id, clip_id, language, status (pending | processing | done | error)
            evidencia: diálogo Transcribe con idioma (S04)
            confianza: alta

Word        id, transcript_id, text, start_ms, end_ms, speaker_id, deleted (bool), corrected_text
            evidencia: el clic en una palabra mueve el cursor; borrar texto borra el audio; corregir
                       no mueve el audio
            confianza: media (la idea de "borrado lógico" frente a recorte real es una suposición)

Speaker     id, project_id, label
            evidencia: Detect speakers, descargar las grabaciones por hablante
            confianza: alta

FilterSettings  project_id, enhance_speech_enabled, enhance_strength (0-100)
            evidencia: S09
            confianza: alta

ExportJob   id, project_id, kind (audio_mp3 | audio_wav | video | transcript_txt | transcript_pdf |
            transcript_docx | audiogram | clip), range_start_ms, range_end_ms, status, output_url
            evidencia: S11
            confianza: media
```

Relaciones: User 1-n Project, Project 1-n MediaAsset, Project 1-n Clip, Clip 0-1 MediaAsset, Clip 0-1 Transcript, Transcript 1-n Word, Speaker 1-n Word, Project 1-1 FilterSettings, Project 1-n ExportJob.

Idea clave (suposición): la edición no destructiva funciona como una lista de decisiones de edición. Las palabras borradas o movidas definen qué rangos del audio original suenan y en qué orden. La exportación renderiza esa lista.

## Matriz de funcionalidades

Ver `features.csv`. Must: 14, should: 11, could: 8, skip: 5.

## Fuera de alcance (no se puede o no se debe clonar)

- **El modelo de Enhance Speech de Adobe.** Es IA propietaria. Se sustituye por uno abierto (por ejemplo DeepFilterNet o Resemble Enhance). El resultado no sonará igual.
- **El motor de transcripción de Adobe** (el mismo que el de Premiere Pro). Se sustituye por Whisper o similar, con tiempos por palabra, y por pyannote para separar hablantes.
- **La biblioteca de música de Adobe.** Es contenido con licencia. Hay que usar música propia o con licencia libre (CC0 o similar).
- **Las cuentas Adobe, Firefly Pro y Adobe Express.** Son su red y sus planes.
- **La grabación remota con invitados.** Está fuera del alcance elegido, aunque se podría añadir más adelante con WebRTC.

## Tamaño

Pantallas 13, flujos 8, entidades 9.

Partes difíciles:
1. Edición no destructiva por texto: mapear la selección de texto a rangos de audio, reproducir sin cortes la lista de decisiones y renderizar la exportación con fundidos (ffmpeg).
2. La cadena de IA: transcripción con tiempos por palabra, separación de hablantes y mejora de voz, ejecutada en local o en un servidor con GPU, como trabajos en segundo plano.
3. Grabación en el navegador fiable, con subida por trozos para no perder nada si se cae la conexión, y archivos grandes (hasta 5 GB de vídeo).

Tamaño: **M** (unas semanas) solo para audio, como proyecto personal. Con vídeo, audiogramas y subtítulos pasa a **L**.
