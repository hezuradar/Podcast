# Qué mejorar respecto al original

Fecha: 2026-11-19. **Muestra pequeña y de segunda mano:** no se ha montado un `reviews.csv` reseña por reseña; los temas salen de reseñas publicadas y de hilos del foro oficial de Adobe que resumen opiniones de usuarios. Ningún tema llega al umbral de evidencia fuerte (3+ reseñas directas, 2+ fuentes), así que todos se marcan como **orientativos**. Las opiniones se parafrasean; no se usan como testimonios.

## Lo que critican

| tema | qué se dice (parafraseado) | fuentes | fuerza |
| --- | --- | --- | --- |
| Fiabilidad de Studio | grabaciones que tras subir quedan en silencio y sin transcripción; exportaciones que no terminan; vídeo que no se puede editar desde el texto | [foro Adobe: exportar](https://community.adobe.com/t5/adobe-podcast-discussions/unable-to-export-adobe-podcast-file/m-p/15337645/highlight/true), [foro Adobe: subida fallida](https://community.adobe.com/t5/audition-beta-discussions/adobe-podcast-studio-upload-failed/td-p/14604832), [foro Adobe: vídeo](https://community.adobe.com/questions-514/problem-with-videos-in-adobe-studio-podcast-1498729) | orientativa (3 hilos, 1 fuente) |
| Depende de buena conexión | necesita una conexión muy estable; a veces no va fluido | [G2](https://www.g2.com/products/adobe-podcast) | fina |
| Archivos largos | problemas de rendimiento con entrevistas de ~45 min; soporte difícil de contactar | [toolsforhumans.ai](https://www.toolsforhumans.ai/ai-tools/adobe-podcast) | fina |
| Mejora de voz sobreprocesada | voz algo robótica, finales de palabra cortados, mal con varias voces en una pista; el control de intensidad es de pago | [Saltwaves](https://saltwaves.studio/blog/adobe-podcast-alternative), [The Podcast Consultant](https://thepodcastconsultant.com/blog/adobe-ai-tools), [MikeShareAI](https://mikeshareai.com/adobe-podcast-review) (este último dice lo contrario: v2 lo mejoró) | orientativa, con fuentes que se contradicen |
| Límites del plan gratuito | 30 min por archivo, horas de proceso al día, proyectos por día | [TechPilot](https://techpilot.ai/tools/adobe-podcast/), [toolsforhumans.ai](https://www.toolsforhumans.ai/ai-tools/adobe-podcast) | orientativa |

## Lo que falta

- Edición de vídeo por texto que funcione de verdad (hilo del foro sobre vídeo).
- API pública (mencionado en reseñas; no relevante para uso personal).

## Lo que nadie resuelve

- Editar podcasts **sin subir el audio a la nube**: para quien graba entrevistas internas o con datos sensibles, cualquier herramienta en línea es un problema.

## Plan de mejoras (por evidencia × coste)

| mejora | tamaño | quién | estado |
| --- | --- | --- | --- |
| Sin límites de duración ni de uso diario: todo corre en tu PC | S | ya hecho | hecho |
| El audio nunca sale de tu equipo | S | ya hecho | hecho |
| No perder nunca una grabación: subir trozos mientras se graba (no solo al parar) | M | /replica-build | pendiente (la grabación se guarda al parar) |
| Exportación fiable y comprobable: el render usa la misma lista de cortes que el reproductor, con márgenes y fundidos | S | ya hecho | hecho; verificado transcribiendo el MP3 |
| Intensidad de mejora de voz ajustable para todos, con 70 % por defecto (no 90 %) | M | /replica-backend | pendiente (falta instalar DeepFilterNet) |
| Archivos largos sin atascos: cargar el audio por trozos en el navegador | M | /replica-build | pendiente (ahora se decodifica entero) |

Añadidas a `features.csv` como filas con `original = no`.

## Enfoque

Como es un proyecto personal no hay que venderlo, pero sí sirve para decidir qué priorizar:

> **Para quien edita entrevistas y no quiere depender de la nube**, este editor transcribe y corta el audio **en tu propio ordenador**: sin límites diarios y sin subir nada.
> Evidencia: fiabilidad y límites (orientativa, 3 hilos del foro de Adobe + 3 reseñas).

Recomendado: este. Las alternativas (mejor mejora de voz; vídeo) dependen de piezas que aún no están construidas.
