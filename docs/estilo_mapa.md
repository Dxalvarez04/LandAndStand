# Estilo del mapa · «Apolo»

Referencia de diseño del mapa (persona 2) y del aspecto del panel (la lógica del panel es de la persona 3). Cualquier cambio visual debe respetar este documento. Si algo no encaja, se cambia aquí primero.

**Inspiración:** [NASA Eyes on the Solar System](https://www.jpl.nasa.gov/news/explore-the-solar-system-with-nasas-new-and-improved-3d-eyes/) (azul noche, líneas finas, una sola tarjeta flotante) y la tipografía Futura de la placa que el Apolo 11 dejó en la Luna.

**Tono:** un instrumento técnico y fiable, no un póster. Las cifras van en monoespaciada, como en la instrumentación. Hay una regla en km sobre el borde del área de estudio, y los paneles son sólidos con bordes de 1 px.

**Principio de uso** (cabina de Orion): por defecto solo se muestra lo necesario para responder «¿puedo ir ahí y volver hoy?». Si un elemento no ayuda a responderlo, sobra.

## Color

Los tokens están en `src/lib/mapa/estilo.ts` (para SVG y canvas) y se repiten como clases de Tailwind en los componentes.

| Token | Valor | Uso |
|---|---|---|
| `noche` | `#060a17` | Fondo del instrumento, clave y controles |
| `noche2` | `#0b1226` | Fondo del mapa sin imagen |
| ficha | `#070c1b`, opaca | Ficha del punto (sin transparencia ni desenfoque) |
| línea | `#a0beff` al 15–30 % | Bordes de 1 px, separadores y regla |
| `texto` | `#eaf0ff` | Texto principal |
| `texto2` | `#b9c6e6` | Texto secundario |
| `rotulo` | `#8d9cc2` | Etiquetas de datos («Distancia al hábitat»), coordenadas, regla |
| `ambar` | `#ffcf70` | Lo que está al alcance: destinos ≥ 50 %, contorno del 90 %, frase «probable» |
| `ruta` | `#ff8fd8` | Ruta de ida (continua) y vuelta (punteada), retícula de selección |
| Probabilidad | viridis | Lo exige la especificación. No se cambia. |
| Contorno 50 % | `#e8f1ff`, discontinuo 4-3, 1,2 px | |
| Contorno 90 % | `ambar`, continuo, 1,7 px | |

El ámbar es el **único acento**. El rosa solo se usa para la selección y la ruta.

## Tipografía

`src/components/mapa/fuente.ts`. Las dos fuentes se cargan solo en el mapa.

- **Jost** (versión libre de Futura), pesos 300, 400 y 500: todo el texto.
- **IBM Plex Mono** (clase `CIFRA`, con `tabular-nums`): todas las cifras (porcentajes, distancias, coordenadas, km de la regla, PIA y sol de las fotos).
- **El dato principal** (porcentaje de la ficha): 36 px, peso 300. El signo % va a media altura y pegado a la cifra.
- **Nombre en la ficha**: 15 px, peso 500, precedido del id en monoespaciada (`T3`).
- **Nombres de destino en el mapa**: 13,5 px sin caja, con halo oscuro (`text-shadow`).
- **Mínimo**: 11 px para cifras de referencia (regla, coordenadas) y 12 px para cualquier texto que haya que leer.
- Nada de mayúsculas con espaciado ni de rótulos tipo «etiqueta»: la jerarquía se marca con tamaño y peso.

## Forma

| Elemento | Forma |
|---|---|
| Ficha, clave y controles | Rectángulo con radio de 3–6 px, sólido, borde de 1 px |
| Miniatura de la foto | Radio de 2 px |
| Hábitat | Triángulo blanco con borde oscuro y el rótulo «Hábitat» |
| Destinos de la misión | Punto de 10 px con borde oscuro (rombo si lo añadió la tripulación): blanco, o ámbar si es ≥ 50 %. Etiqueta con id (M1, P1…), nombre y porcentaje |
| Puntos de referencia (T1–T6, Curiosity) | Anillo hueco con un punto, poste más tenue y texto más apagado; el porcentaje sin ámbar (no son metas, solo orientan). Al tocarlos, su foto |
| Selección | Anillo rosa fijo de 11 px de radio con punto central (no gira) |

- Las zonas táctiles miden al menos 44 px.
- La única sombra es una sombra negra bajo la ficha, para separarla del mapa. Sin sombras de color.

## Disposición

La página nunca hace scroll: solo hay dos zonas, mapa y panel. El mapa ocupa siempre toda la pantalla y el panel flota encima (columna derecha en horizontal, 40 % inferior en vertical). No redimensiona el mapa: las esquinas del mapa se apartan de él y la escena 3D desplaza su centro para quedar centrada en la parte visible, con la misma animación que el panel (0,5 s, ease-in-out).

En el globo de Marte y durante el descenso solo se ve el mapa: el panel entra cuando la cámara ya se ha posado en la zona de estudio y sale al volver al globo (bajo el fundido). Una pestaña en su borde (a la izquierda en horizontal, arriba en vertical) lo esconde y lo vuelve a sacar; al elegir un punto para un destino nuevo vuelve a salir solo.

En el terreno 3D, cada esquina tiene una función fija:

| Esquina | Contenido |
|---|---|
| Arriba izquierda | «‹ Globo de Marte» (en móvil, solo la flecha). Se oculta mientras se elige un punto, y en su sitio sale la barra «Toca el punto del destino nuevo». Debajo, la indicación de la primera vez |
| Arriba derecha | Zoom + / − y «3D \| Cenital». No hay botón para volver al encuadre inicial: lo hace la tecla 0, y al girar la pantalla se vuelve a encuadrar solo |
| Abajo izquierda | Clave |
| Abajo derecha | Atribución («Fuentes · USGS · NASA/JPL-Caltech») y brújula |

En el mapa 2D (plan B sin WebGL):

| Esquina | Contenido |
|---|---|
| Arriba izquierda | Indicación de la primera vez («Toca cualquier punto…»); desaparece al primer toque |
| Arriba derecha | Zoom + / − y «Zona de estudio» (este último solo con zoom) |
| Abajo izquierda | Clave: «Probabilidad de ir y volver», barra viridis del 2 % al 100 % con las marcas del 50 % y el 90 % |
| Abajo derecha | Atribución («Fuentes · USGS · NASA/JPL-Caltech»), barra de escala y flecha de norte |

- El área de estudio (3,52 km) es el mayor cuadrado que cabe, centrado, con una regla en km (marcas cada 500 m y cifras cada 1 km).
- **Contexto:** alrededor se ve el terreno HiRISE real, apagado (brillo 50 %, saturación 55 %), porque ahí no hay cálculo. Hay 1 km al oeste (donde acaba el mosaico) y 3 km al norte, este y sur. Se puede alejar hasta que el contexto llene la ventana; en el 2D, «Zona de estudio» vuelve al encuadre inicial.
- **Capas de la zona de estudio, de abajo arriba:** HiRISE en color, probabilidad (viridis al 60 %), relieve sombreado de 8 m en fusión *soft-light* (para leer las crestas a través del color) y, por último, contornos y ruta recortados al borde de la zona.
- Si a los lados no queda sitio para la clave y la escala, se les reserva una franja abajo para que no tapen la regla.

## Ficha del punto

- Se abre **junto al punto tocado**, en el sitio que no tape el camino trazado hasta el hábitat ni el punto: prueba a derecha e izquierda (centrada, más arriba o más abajo), arriba y abajo, y se queda con la que menos tape (primero, la del lado contrario al camino). Mientras llega la ruta del modelo evita la línea recta al hábitat. Al mover el mapa no cambia de lado salvo que el suyo empiece a tapar el camino. La franja compacta (móvil) va arriba o abajo con el mismo criterio.
- En un punto cualquiera o en un punto de referencia (no en un destino de la misión ni en el hábitat), al final, «Añadir a los destinos de la misión» (botón discontinuo con la cruz rosa, como en el panel; en la franja compacta, solo la cruz): el panel sale, pide el nombre y las tareas y el punto queda marcado como destino nuevo. En un punto de referencia se proponen su nombre y lo que se estudió allí.
- En un destino de la misión muestra qué hay allí y sus tareas previstas; en un punto de referencia, «Punto de referencia · …» y la foto de Curiosity.
- Responde, en este orden:
  1. ¿Puedo ir y volver? (porcentaje y frase)
  2. ¿Qué voy a ver? (foto de Curiosity, solo en destinos)
  3. ¿A qué distancia?
  4. ¿Por dónde? (leyenda de ida y vuelta, y el perfil de la ruta del modelo: longitud de ida, subida acumulada y pendiente máxima)
  5. Al final, la latitud y longitud.
- **Vista previa:** la miniatura de lo que vio Curiosity en ese destino, con «Lo que vio Curiosity» y el tipo (360°, Panorámica o Foto). Al tocarla se abre el visor.
- **Visor** (`VisorFoto.tsx`), a pantalla completa:
  - En 360° se gira sin fin y el rumbo se indica en grados; las panorámicas se desplazan de lado a lado; las fotos se amplían y se mueven.
  - Se controla arrastrando, con la rueda, pellizcando o con doble toque. Con el teclado: flechas, + y −, y Esc para volver.
  - En la cabecera van el PIA, la cámara, el sol y el crédito oficial de esa imagen (PIA23042 es «NASA/JPL-Caltech», sin MSSS).
  - **Rumbo:** solo si el pie oficial dice hacia dónde mira la imagen (T1: noroeste en los extremos y sureste en el centro; T2: de oestesuroeste a nornoroeste). Se muestra arriba en el centro de la imagen («135° SE»). Si el pie no lo dice, no se muestra: no se inventa.
  - **Ficha oficial:** título oficial de la NASA, resumen en español del pie de foto, fechas, número de imágenes, crédito y enlace a la ficha de la NASA. En pantallas anchas se abre a la derecha; en móvil, abajo y plegada al entrar.
  - Datos en `src/lib/data/fotos.ts`.

## Ruta

- Es la del modelo: el camino de menor energía (capa 5), con los parámetros centrales y el primer tripulante. La ida es continua y la vuelta punteada. En este terreno suelen coincidir.
- El camino va de celda en celda en 8 direcciones. Se dibuja suavizado (Chaikin, 2 pasadas) para que no se vea en zigzag de 45°: pasa por las mismas celdas.
- Si el modelo no encuentra camino dentro del presupuesto de energía, la ficha dice «Sin ruta». La ruta aproximada solo se usa si el modelo no calcula rutas.

## Fuentes oficiales

- Al tocar «Fuentes» (abajo a la derecha) se abre una vista a pantalla completa con las cuatro fuentes. De cada una se dan el producto oficial, la autoría y fecha, el detalle técnico, el crédito exacto de la especificación (§12) y el enlace a la página oficial.
- También se muestran la zona de estudio (lugar, tamaño, proyección y límites) y la tabla de imágenes de Curiosity con su PIA y crédito.
- Datos en `src/lib/data/fuentes.ts`. Cualquier cifra o crédito nuevo tiene que salir de una ficha oficial.

## Pantallas

| Pantalla | Mapa | Panel | Ficha |
|---|---|---|---|
| Nave / escritorio (horizontal) | Pantalla completa; la escena se centra en lo que deja el panel | Columna derecha de ~420 px encima del mapa; debe caber entera; se esconde con la pestaña | Junto al punto |
| Móvil vertical (< 560 px de ancho) | Pantalla completa; la escena se centra en el 60 % superior | 40 % inferior encima del mapa, se desplaza por dentro; se esconde con la pestaña | Franja compacta (miniatura, porcentaje, nombre, franja y distancia), arriba o abajo según dónde esté el punto. La clave y la escala se ocultan mientras la franja está abajo |
| Pantalla baja (≤ 500 px de alto, móvil horizontal) | Sin botones de zoom (se usan los dedos) ni clave | Columna derecha, se desplaza por dentro | Franja compacta |
| Mapa 3D en < 560 px de ancho | Controles compactos: sin + / − (pellizco). «Volver al globo» queda solo con la flecha. La vista 3D se encuadra más cerca y más desde arriba | — | Franja compacta |
| Globo de Marte (cualquier pantalla) | Pantalla completa | Oculto | — |

## Mapa 3D

El mapa principal es 3D (`src/components/mapa3d/`); el 2D queda como plan B si no hay WebGL o si la escena falla.

1. **Globo.** Marte con el color Viking, el relieve MOLA, una atmósfera fina (ocre de día, azulada en el terminador) y estrellas. Gale va en relieve y señalado con una línea guía: un punto blanco sobre el cráter, una línea vertical fina con un codo y, arriba, «Cráter Gale» con «Entrar a la zona de estudio ›». Tocar el nombre (o el punto) baja a la zona de estudio; no hay descenso automático ni otros botones. El rótulo se oculta cuando Gale queda en la cara oculta. «‹ Globo de Marte», en el terreno, vuelve con el mismo fundido.
2. **Descenso.** Unos 2 s hasta ~150 km sobre Gale y un fundido breve (0,25 s) al color del cielo marciano (#cfa985).
3. **Terreno.** El relieve real (DEM 1 m reducido a 16 m) con HiRISE encima. Dentro de la zona de estudio van la probabilidad, los contornos, la regla y el borde, pintados en el propio material para que el relieve los ilumine; tienen algo de emisión para leerse igual en las laderas en sombra. Hay cielo «butterscotch», bruma que depende de la altura y sol del oestesuroeste a 32° (como en las imágenes HiRISE). Fuera de la caja, el borde se prolonga en un faldón horizontal que se pierde en la bruma.
4. **Vistas.** «3D» (oblicua desde el sursuroeste) y «Cenital» (norte arriba, sin giro: se lee como un plano y es la única con escala). El relieve es siempre el real.
5. **Etiquetas.** Son HTML y su tamaño no cambia con la distancia. El punto queda sobre un poste fino y el texto a un lado fijo por sitio, para que no se pisen. Los destinos de la misión propuestos llevan punto, los añadidos rombo, y el ámbar marca los que pasan del 50 %. Los puntos de referencia de Curiosity llevan anillo hueco y texto más apagado. La clave explica las dos marcas («Destino» y «Referencia»).
6. **Destinos de la misión (decisión de la persona 3).** El plan empieza con seis destinos propuestos (M1–M6: cerros del norte, arenal del oeste, cresta clara, llano del noreste, terreno fracturado del sur y escarpe del este), elegidos sobre el DEM y la imagen HiRISE para que unos se alcancen el sol 1 y otros solo más tarde o nunca en 30 soles. Son una propuesta del equipo, no sitios de Curiosity, y se pueden quitar. Para añadir uno, el panel pide un punto con «Añadir destino en el mapa». En el mapa sale la barra «Toca el punto del destino nuevo», con cruz por cursor; al pasar por encima se ve la probabilidad, y «Cancelar» o Esc vuelven atrás. El punto elegido se marca con un rombo hueco rosa, «Destino nuevo · ponle nombre en el panel». Al guardar aparece como P1, P2… y su ficha muestra las tareas previstas, la ruta y el recorrido.

## Movimiento

- La zona alcanzable crece al cambiar de sol (550 ms, ease-in-out).
- **Cámara, lo que hace la persona:** arrastrar mueve sobre el suelo como en un mapa; dos dedos, el botón derecho o arrastrar con Mayús, Alt, Ctrl o ⌘ pulsada giran; la rueda o el pellizco acercan hacia el cursor. Todo va amortiguado con un muelle crítico (0,32 s; 0,14 s mientras se arrastra), sin rebote. Límites amplios: se puede bajar hasta 140 m, inclinar hasta 86° (casi el horizonte) y alejarse hasta 30 km. La cámara no atraviesa el relieve y, al soltar, el punto de giro se posa en el suelo (la cámara sube o baja con él). El punto de mira no sale del terreno.
- **Cámara, los movimientos automáticos** son vuelos de duración fija: llegada 1,7 s, cambio de vista 0,95 s, volver al encuadre inicial (tecla 0 o al girar la pantalla) 0,7 s, ir a un destino pulsado en el panel 1,1 s (se acerca sin cambiar el rumbo y lo selecciona). Del globo al terreno, unos 3,3 s en total. Interpolan en esféricas alrededor del punto de mira, así que la cámara describe un arco, gira por el camino corto y la distancia cambia en escala logarítmica. Arrancan y frenan con aceleración nula (smootherstep). Cualquier gesto los interrumpe.
- **Globo:** giro y zoom amortiguados, más lentos cuanto más cerca.
- Las etiquetas aparecen con un fundido de 0,6 s cuando la cámara se posa. Al entrar y al volver al globo hay un fundido al color del cielo.
- Fuera de eso, nada gira, late ni brilla; la brújula solo sigue a la cámara.
- Con `prefers-reduced-motion` no hay vuelos ni descenso: se salta directamente.

## Panel

El panel sigue el mismo estilo que el mapa. Las piezas comunes están en `src/components/panel/comun.tsx`: `CIFRA`, los colores de texto y borde, `num()` (decimales con coma), `Seccion`, `Deslizador`, `MarcaDestino` y `Chevron`.

- **Estructura:** una columna sólida (`#0a0f1f`) dividida en secciones con un borde de 1 px. Cada sección tiene título (15 px, peso 500), una ayuda corta y el valor a la derecha en monoespaciada («sol 1 / 30», «35 %»).
- **Estado del cálculo:** solo mientras se calcula, una barra de 2 px pegada al borde superior del panel (para lectores de pantalla, «Calculando el escenario»). No ocupa sitio, así que nada se mueve al arrastrar un deslizador. Arrastrar un deslizador no acumula cálculos: solo se calcula el último valor.
- **Deslizadores:** pista fina, relleno claro, marcas alineadas con el centro del tirador (12 × 22 px, blanco) y anillo rosa con el foco.
- **Quién camina:** una línea resumen (id y apellido) que se abre con «Cambiar»; las casillas son cuadradas y propias.
- **Destinos de la misión:** tabla Destino / Distancia / Desnivel / Ir y volver, con el mismo marcador que el mapa (punto o rombo, ámbar si es ≥ 50 %). Los puntos de referencia T1–T6 no aparecen. «Quitar de la misión» dentro de cada fila desplegada. Cada fila se despliega para ver sus tareas y el mapa vuela hasta ese destino y lo selecciona. «Añadir destino en el mapa» es un botón discontinuo con una cruz rosa. Mientras se elige el punto, el bloque lleva un borde rosa a la izquierda.
- **Pie:** créditos de datos y «NASA Space Apps Challenge 2026 · Madrid».

## Prohibido

Para que no parezca una interfaz genérica hecha por IA:

- Inter o Roboto. La monoespaciada solo para cifras, nunca para texto.
- Degradados morados o azul-morado, y texto en degradado.
- `backdrop-blur`, paneles translúcidos tipo cristal y píldoras (`rounded-full`) en botones o etiquetas.
- Mayúsculas con espaciado para rótulos, iconos decorativos y emojis.
- Brillos, pulsos o rotaciones decorativas; grano; escuadras de HUD.
- Más de un acento: el ámbar es el único color que significa «al alcance».
- Textos que no respondan a la pregunta del mapa (avisos de desarrollo, títulos de sección, explicaciones largas).
- La palabra «seguro» o «zona segura». Se dice «alcanzable bajo los supuestos indicados».
- Pintar `prob` sin pasar por `src/lib/mapa/geo.ts`, porque la fila 0 es el sur.
