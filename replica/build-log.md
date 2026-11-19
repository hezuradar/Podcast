# Build log

| pantalla | fecha | estado | qué falta | qué costó más de lo previsto |
| --- | --- | --- | --- | --- |
| Shell | 2026-11-19 | hecho | — | Next 16.4 trae `cacheComponents` activado: `export const dynamic` ya no vale; los datos por petición van en un componente con `await connection()` dentro de `<Suspense>` |
| S01 Inicio (lista de proyectos) | 2026-11-19 | hecho | — (vacío, cargando con skeleton, con datos, borrar con confirmación, título largo, 390 px) | — |
| S02 Editor vacío + subida | 2026-11-19 | parcial | el archivo no se guarda ni se transcribe: se adjunta la transcripción de ejemplo (capa falsa) | — |
| S03 Grabación | — | no | todo; botón visible pero desactivado con el motivo | — |
| S04 Diálogo de transcripción | — | no | selector de idioma y detectar hablantes (componentes hechos en /design, sin conectar) | — |
| S05 Editor de transcripción | 2026-11-19 | hecho (sin audio) | audio real; búsqueda en el texto | La edición por palabras se hizo con un editor propio en vez de TipTap (ver nota) |
| S06 Corregir palabra | 2026-11-19 | hecho | — | — |
| S07/S08 Música | — | no | biblioteca y opciones de pista; panel con estado vacío | — |
| S09 Filtros | — | no | interruptor y deslizador visibles pero desactivados hasta el worker | — |
| S10 Marcadores | 2026-11-19 | parcial | solo añadir al final; falta arrastrar y grabar encima | — |
| S11 Exportar | 2026-11-19 | parcial | TXT y lista de cortes (JSON) funcionan; MP3/WAV necesitan el worker | — |
| S12 Audiogramas, S13 Vídeo | — | no | fuera de la primera versión | — |

## Decisiones

- **Editor propio en lugar de TipTap.** La edición es por palabras completas (cada una apunta a un trozo de audio). Un editor propio con selección por palabras, teclado y portapapeles interno es más simple y más seguro que adaptar ProseMirror; la lógica está en `src/lib/doc/operations.ts` con tests. Se puede cambiar más adelante si hace falta escribir texto libre.
- **Capa de datos falsa** (`src/lib/data/projects.ts`, en memoria) con las mismas funciones que tendrá SQLite.
- **Lista de decisiones de edición** (`src/lib/edl/edl.ts`) compartida por reproductor y exportación, con tests.

## Comprobado

- 27 tests unitarios (operaciones del documento, lista de decisiones, formato) en verde.
- En el navegador: crear proyecto, rechazar un PDF, subir un MP3 (transcripción de ejemplo), clic en palabra = salto, borrar con Supr, guardado automático, deshacer, seleccionar con Mayús+flechas, cortar y pegar, reproducir con resaltado, exportar a 390 px y 1440 px.
- Corregido durante la prueba: el diálogo quedaba debajo de la barra fija en móvil (capas `z-50`); el panel lateral en móvil no ocupaba el ancho.
