# Paridad con el original

Fecha: 2026-11-20. Calculado con `parity.py` sobre `replica/features.csv` (must ×3, should ×2, could ×1; parcial = mitad; no se puntúa lo excluido a propósito ni lo que añadimos).

## Números

- **Funcionalidades: ver la última ejecución abajo.** Imprescindibles: 13 de 14 antes de corregir la grabación (B1); 14 de 14 si la prueba F02 pasa.
- **Diseño (comparación de capturas): no medido.** No hay capturas del original: los términos de Adobe no permiten usar la cuenta para recrear el producto, y la pantalla se diseñó desde la documentación pública. `imgdiff.py` no tiene con qué comparar.

## Por área (de peor a mejor)

| área | puntuación | qué falta |
| --- | --- | --- |
| filtros (mejora de voz) | 0 | instalar DeepFilterNet en el worker |
| música | 0 | biblioteca propia/CC0, fundidos, ducking |
| vídeo, audiogramas, subtítulos | 0 | fuera de la primera versión |
| grabación | 37,5 → 75 | subir trozos mientras se graba |
| estructura (marcadores) | 50 | arrastrar y grabar encima |
| exportar | 57 | PDF/DOCX, recortes, pistas por hablante |
| audio subido | 60 | multipista |
| transcripción | 75 | separar hablantes |
| editor | 91 | buscar en el texto |
| proyectos | 100 | — |

## Comportamiento

| flujo | original | Hitzez | decisión |
| --- | --- | --- | --- |
| Subir y transcribir | en la nube; límites en el plan gratuito | en tu equipo; sin límites; tarda ~lo que dura el audio con el modelo `small` en CPU | mantener; avisar del tiempo |
| Borrar una frase | borrar el texto | igual; también con teclado (Mayús+flechas, Supr) | mantener |
| Exportar | botón Export, varias salidas | MP3/WAV/TXT; el MP3 se verificó volviendo a transcribirlo | mantener |
| Grabación | sube mientras graba | se sube al parar | mejorar: trozos durante la grabación |

## Veredicto

**Usable para uso personal** si F02 pasa: todos los imprescindibles hechos, ningún bug S1/S2 abierto. Para «mejor que el original» faltan las mejoras de `fixes.md` que dependen de piezas no construidas (mejora de voz ajustable, carga por trozos).

## Siguientes cinco

1. Buscar en la transcripción (should, pequeño).
2. Mejora de voz con DeepFilterNet e intensidad ajustable.
3. Separar hablantes con sherpa-onnx.
4. Subir la grabación por trozos mientras se graba.
5. Cargar el audio por trozos para episodios de más de una hora.
