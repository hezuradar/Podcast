# Marca: Hitzez

Fecha: 2026-11-19. Proyecto personal: la marca sirve para que la app sea claramente tuya y no se confunda con el original, no para venderla.

## Nombre

**Hitzez** — en euskera, "con palabras" o "a base de palabras". Dice exactamente lo que hace (editas el audio con las palabras), es corto, se lee bien en castellano y no se parece en sonido, forma ni significado al original.

Candidatos descartados: Ahotsa ("la voz", demasiado genérico), Txio ("pío", poco claro), Testuz ("por texto", suena a herramienta de oficina), Mozketa ("corte", difícil de pronunciar fuera del euskera).

## Comprobaciones (por hacer: ninguna se ha ejecutado)

Son comprobaciones de criba, no una búsqueda legal. Para uso personal no son necesarias; hazlas solo si algún día lo publicas.

| comprobación | dónde | resultado |
| --- | --- | --- |
| Marca en la UE | euipo.europa.eu (eSearch) o TMview, clases 9 y 42 | por hacer |
| Marca en España | OEPM, localizador de marcas | por hacer |
| Mundial | WIPO Global Brand Database | por hacer |
| Dominio | registrador (hitzez.eus, hitzez.app) | por hacer |
| App Store / Play | buscar "Hitzez" | por hacer |
| Redes y GitHub | buscar el usuario "hitzez" | por hacer |
| La web | buscar "Hitzez podcast" | por hacer |

## Paleta

Se mantienen los tokens de `/replica-design`: acento azul `#2f55d4`, que no pertenece a la familia de color del original (rojo `#FA0F00`, añadido a `brand.json` para que el barrido lo detecte si aparece). Contraste: 28 pares, 0 fallos AA.

## Logo (encargo)

- Idea: un bocadillo de texto cuyo borde inferior es una forma de onda; "hablar" y "escribir" en un solo trazo.
- Tipo: símbolo + nombre en Inter 700.
- Funciona a 16 px (favicon) y a 1024 px.
- Entregables: SVG, icono 1024×1024 sin transparencia, favicons, imagen social 1200×630.
- No debe parecerse al logo del original: nada de cuadrados rojos ni letras "Pc".

## Voz

Directa, cercana y concreta.

| sí | no |
| --- | --- |
| "Borra una frase y desaparece del episodio." | "Potencia tu flujo de trabajo con IA." |
| "Se transcribe en tu equipo." | "Tecnología puntera en la nube." |
| "No se pudo exportar: falta el audio original." | "Ups, algo salió mal." |
| "Parar y transcribir" | "Finalizar sesión de captura" |
| "Tus episodios" | "Biblioteca de contenidos multimedia" |

Los textos de la app ya se escribieron desde cero en este tono durante `/replica-build`.

## Barrido

`python sweep.py . --config replica/brand.json` busca en el código cualquier rastro del nombre, dominios y color del original (salta `replica/`, `node_modules` y la salida de compilación). Resultado: ver abajo.
