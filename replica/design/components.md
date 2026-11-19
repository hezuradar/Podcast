# Componentes

Especificación de cada componente del mapa (`recon.md`, sección Componentes), más los que hacen falta para tener todos los estados. Usan solo tokens (`tokens.json` → `tokens.css` → clases de Tailwind). No hay ni un color ni una medida sueltos en el código.

Base accesible: **Radix UI** (Dialog, DropdownMenu, Slider, Switch, Tooltip, Toast). Iconos: **Lucide** (ISC). Fuentes: **Inter** para la interfaz y **Source Serif 4** para el texto de la transcripción, ambas con licencia OFL. Ningún icono, ilustración, sonido ni texto viene de Adobe.

Estado de foco, el mismo en todos los componentes: `focus-visible` → anillo de 2 px de color `focus`, separado 2 px del borde. Nunca `outline: none` sin poner esto en su lugar.

---

```
Button
  variants  primary, secondary, ghost, danger
  sizes     sm 32px, md 40px, lg 48px (alto); icon-only = cuadrado del mismo alto
  states    default, hover, active, focus-visible, disabled, loading
  tokens    primary: bg accent, hover accent-hover, text on-accent
            secondary: bg surface-raised, border border-input, text text
            ghost: transparente, hover surface, text text
            danger: bg danger, text on-danger
            radius md, font sm/600, padding x 16 (md)
  a11y      <button> real; icon-only con aria-label y Tooltip; loading = aria-busy,
            spinner y el texto se queda (oculto visualmente si hace falta), no se puede volver a pulsar
  used on   todas (New project, Export, Transcribe, Save, Cancel)
```

```
RecordButton
  variants  idle, recording, paused
  sizes     56px círculo (barra inferior)
  states    ready, recording (punto que late, 1 s, se para con prefers-reduced-motion),
            paused, disabled (sin micrófono o permiso denegado), focus-visible
  tokens    bg record, icon on-record, contador mono xs en text-muted
  a11y      <button aria-pressed>, etiqueta "Grabar" / "Pausar grabación" / "Reanudar";
            tiempo transcurrido en aria-live="off" y anunciado al parar;
            atajo R. Desactivado → explica el porqué en texto visible al lado.
  used on   S02, S03, S10
```

```
ToolRail
  variants  vertical (escritorio), barra inferior (móvil < 768)
  items     Añadir, Música, Marcador, Filtros (icono + texto corto debajo)
  states    default, hover, active (panel abierto: bg accent-soft, icono on-accent-soft), focus-visible
  tokens    ancho tool-rail-width 64, bg surface, borde derecho border
  a11y      <nav aria-label="Herramientas">, cada item es <button aria-pressed> que abre su SidePanel;
            flechas arriba/abajo para moverse entre items (roving tabindex)
  used on   S02, S05
```

```
SidePanel
  variants  Música, Filtros
  states    open, closed, loading (skeleton), empty (biblioteca vacía: texto + botón Subir)
  tokens    ancho side-panel-width 320, bg surface-raised, borde izquierdo border, shadow pop en móvil
  a11y      <aside aria-labelledby>, título h2; Escape lo cierra y devuelve el foco al ToolRail;
            en móvil es un Dialog (hoja inferior) con foco atrapado
  used on   S07, S09
```

```
TranscriptBlock
  variants  speech, music, placeholder
  states    default, hover (asa de arrastre visible), selected, playing (borde izquierdo accent),
            transcribing (skeleton de líneas + progreso), error (mensaje + Reintentar), dragging
  tokens    speech: bg bg, nombre del hablante en speaker-N xs/600
            music: bg block-music, texto on-block-music, icono de nota, duración y fundidos
            placeholder: bg block-placeholder, texto on-block-placeholder, borde discontinuo
            radius md, padding 16, separación entre bloques 12
  a11y      cada bloque es un <section aria-label="Hablante 1, 0:42">; el asa es un <button>
            "Mover bloque" que funciona con teclado (espacio para coger, flechas, espacio para soltar)
            y anuncia la posición en aria-live
  used on   S05, S10
```

```
WordToken
  variants  normal, corrected (subrayado punteado), low-confidence (subrayado ondulado text-muted)
  states    default, active (bajo el cursor: bg word-active, text on-word-active), selected
            (bg selection), editing (S06), hover (cursor de texto)
  tokens    font transcript 18/30, radius sm en el resaltado, sin cambiar el ancho al resaltar
  a11y      el texto es texto normal dentro del editor (contenteditable de TipTap), no botones;
            clic o Ctrl+Enter sobre una palabra = mover el cursor de reproducción ahí;
            el resaltado de reproducción NO se anuncia (sería ruido)
  used on   S05, S06
```

```
CorrectWordPopover
  variants  —
  states    open, saving, error (texto vacío)
  tokens    bg surface-raised, shadow pop, radius md, input de una línea
  a11y      Radix Popover; foco al input con la palabra seleccionada; Enter guarda, Escape cancela;
            etiqueta "Corregir palabra"
  used on   S06
```

```
Transport
  variants  —
  items     ir al inicio, retroceder 5 s, reproducir/pausar, avanzar 5 s, tiempo actual / total (mono)
  states    playing, paused, loading (buffering de trozos), disabled (proyecto vacío)
  tokens    alto transport-height 72, bg surface-raised, borde superior border
  a11y      botones con aria-label; espacio = reproducir/pausar cuando el foco no está en el texto;
            J/K/L como atajos opcionales
  used on   S05, S13
```

```
Switch
  states    on, off, disabled, focus-visible
  tokens    pista: off border-input / on accent; botón bg; 36x20
  a11y      Radix Switch (role="switch", aria-checked), con <label> visible
  used on   S09
```

```
Slider
  variants  intensidad 0-100
  states    default, dragging, disabled (con el filtro apagado), focus-visible
  tokens    pista border, relleno accent, pulgar 16px bg con borde accent
  a11y      Radix Slider; flechas ±1, Re Pág/Av Pág ±10; aria-valuetext "70 %"
  used on   S09
```

```
Menu
  variants  opciones de clip, opciones de pista de música
  states    open, closed, item hover/focus, item disabled
  tokens    bg surface-raised, shadow pop, radius md, item sm alto 32
  a11y      Radix DropdownMenu (flechas, Escape, typeahead); el disparador es un botón icon-only
            con aria-label "Opciones del bloque"
  used on   S04, S08
```

```
Dialog
  variants  Transcribir, Exportar, Confirmar borrado
  states    open, submitting, processing (progreso), error, done
  tokens    bg surface-raised, shadow pop, radius lg, ancho máx 480, fondo rgba(16,24,40,.4)
  a11y      Radix Dialog: foco atrapado, Escape cierra (salvo procesando), título y descripción
            enlazados; al cerrar el foco vuelve al disparador
  used on   S04, S11
```

```
Select
  variants  idioma, formato de exportación
  states    default, open, focus-visible, disabled, error
  tokens    alto 40, borde border-input, radius md
  a11y      <select> nativo con <label> (más robusto y accesible que uno propio)
  used on   S04, S11
```

```
Checkbox
  states    checked, unchecked, disabled, focus-visible
  tokens    18px, borde border-input, marcado bg accent con icono on-accent
  a11y      <input type="checkbox"> nativo con <label>
  used on   S04 (Detectar hablantes)
```

```
ProjectCard
  states    default, hover (shadow card), focus-visible, processing (etiqueta "Procesando")
  tokens    bg surface-raised, borde border, radius lg, título base/600, meta xs text-muted
  a11y      toda la tarjeta es un enlace con el título como texto; el menú de la tarjeta es un botón aparte
  used on   S01
```

```
EmptyState
  variants  sin proyectos (S01), proyecto vacío (S02), biblioteca de música vacía (S07)
  tokens    icono Lucide 32 text-muted, título lg, texto sm text-muted, un botón primario
  a11y      texto real, no imagen; el botón es la acción siguiente
  used on   S01, S02, S07
```

```
DropZone
  states    idle, drag-over (borde accent, bg accent-soft), uploading (barra de progreso + cancelar),
            error (tipo o tamaño no admitido, en danger)
  tokens    borde discontinuo 2px border-input, radius lg, padding 32
  a11y      además de arrastrar, siempre hay un <button> "Elegir archivo" que abre el selector;
            el progreso es <progress> con etiqueta
  used on   S02
```

```
ProgressBar
  variants  determinate, indeterminate
  tokens    pista border, relleno accent, alto 4, radius pill
  a11y      <progress> o role="progressbar" con aria-valuenow y etiqueta ("Transcribiendo, 42 %")
  used on   S02, S04, S05, S11
```

```
Toast
  variants  info, success, error, warning
  tokens    bg surface-raised, shadow pop, franja izquierda del color del tipo, texto sm
  a11y      Radix Toast; info y success con aria-live="polite", error con "assertive";
            no desaparece solo si tiene una acción (Reintentar)
  used on   todas
```

```
Skeleton
  tokens    bg surface, radius sm, animación de brillo (desactivada con prefers-reduced-motion)
  a11y      aria-hidden; el contenedor lleva aria-busy="true"
  used on   S01, S05, S07
```

## Estados de pantalla que cada componente debe cubrir

| pantalla | vacío | cargando | con datos | error | sin permiso | móvil |
| --- | --- | --- | --- | --- | --- | --- |
| S01 | EmptyState | Skeleton de tarjetas | ProjectCard | Toast + reintentar | — | 1 columna |
| S02 | EmptyState + DropZone | DropZone subiendo | — | DropZone error | micrófono denegado (RecordButton desactivado) | ToolRail abajo |
| S05 | — | TranscriptBlock transcribiendo | bloques | bloque con error | — | sin SidePanel fijo |
| S07 | EmptyState | Skeleton | lista | Toast | — | hoja inferior |
| S11 | — | ProgressBar | descarga lista | Dialog error | — | Dialog a pantalla completa |
