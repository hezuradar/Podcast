# Plan de pruebas

Fecha: 2026-11-19. Automatizado con Playwright (`app/e2e/`, `npx playwright test`) contra el servidor local con el worker real. Unitarios: Vitest (`npm test`, 30 tests) y unittest del worker (`worker/.venv/Scripts/python -m unittest discover -s worker/tests`, 13 tests).

Todas las pruebas E2E fallan si hay errores en la consola o respuestas 5xx (`e2e/helpers.ts`).

| caso | qué se prueba | cómo |
| --- | --- | --- |
| F01-H1 | crear proyecto y llegar al editor vacío | E2E `projects.spec.ts` |
| F01-E2 | título de 60+ caracteres: se recorta, sin scroll horizontal a 390 px | E2E |
| F01-N1 | archivo no admitido (PDF): mensaje claro | E2E |
| F01-N2 | proyecto inexistente / formato no admitido en la API | manual con curl (404, 415) |
| S01 | borrar proyecto con confirmación | E2E |
| S01 | accesibilidad WCAG 2.1 A/AA (axe) | E2E |
| S01 | 390 px sin scroll horizontal | E2E |
| F01 + F03 + F07 | subir WAV, transcribir (Whisper real), seleccionar con Mayús+flechas, borrar, deshacer, rehacer, guardado, recargar y seguir cortado, axe en el editor, exportar MP3 y recibir la descarga | E2E `editor.spec.ts` |
| F07 | el MP3 exportado no contiene la frase borrada | manual: se volvió a transcribir el MP3 (7,47 s, frase ausente) |
| F04 | corregir una palabra y deshacer | E2E |
| F02 | grabar con micrófono (falso, de archivo), parar, transcripción | E2E con `--use-file-for-fake-audio-capture` |
| F02 | WebM/Opus subido como grabación se procesa | E2E por API |
| S09 | mejora de voz: activar, esperar, comparar con el original, exportar WAV mejorado | E2E; medido aparte: SNR 18 → 33,5 dB, −16,1 LUFS, picos −1,5 dB, transcripción idéntica |
| reproducción | Web Audio reproduce la lista de cortes y resalta la palabra | manual en el navegador integrado (a 2 s: palabra «prueba.») |
| teclado | flechas, Mayús, Supr, Ctrl+X/C/V/Z/Y, espacio, Intro | E2E (parte) + manual |
| unitarios | operaciones del documento, lista de cortes, formato, filtro de ffmpeg, palabras de Whisper | Vitest + unittest |

Fuera de esta ronda: hablantes, música, vídeo (no construidos); Firefox/Safari (solo Chromium).
