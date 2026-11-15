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

En el globo de Marte y durante el descenso solo se ve el mapa: el panel entra cuando la cámara se posa en la zona de estudio (al final del arco de bajada) y sale en cuanto se pide volver al globo, mientras la cámara sube. Una pestaña en su borde (a la izquierda en horizontal, arriba en vertical) lo esconde y lo vuelve a sacar; al elegir un punto para un destino nuevo vuelve a salir solo.

La interfaz está en español y en inglés: el selector de idioma va con los controles del mapa (arriba a la derecha) y la elección se recuerda en ese dispositivo.

En el terreno 3D, cada esquina tiene una función fija:

| Esquina | Contenido |
|---|---|
| Arriba izquierda | «‹ Globo de Marte» (en móvil, solo la flecha). Se oculta mientras se elige un punto, y en su sitio sale la barra «Toca el punto del destino nuevo». Debajo, la indicación de la primera vez: cómo moverse (con el ratón o con los dedos) y «Toca el terreno o un destino para saber si puedes ir y volver». Desaparece al primer toque |
| Arriba derecha | Zoom + / −, «3D \| Cenital», el selector de idioma y «?», que abre «Cómo moverse»: los gestos del ratón o de los dedos y las teclas (se cierra con Esc o tocando fuera). No hay botón para volver al encuadre inicial: lo hace la tecla 0, y al girar la pantalla se vuelve a encuadrar solo |
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

- Al tocar «Fuentes» (abajo a la derecha) se abre una vista a pantalla completa con las nueve fuentes. De cada una se dan el producto oficial, la autoría y fecha, el detalle técnico, el crédito exacto de la especificación (§12) y el enlace a la página oficial.
- También se muestran la zona de estudio (lugar, tamaño, proyección y límites) y la tabla de imágenes de Curiosity con su PIA y crédito.
- Datos en `src/lib/data/fuentes.ts`. Cualquier cifra o crédito nuevo tiene que salir de una ficha oficial.

## Pantallas

| Pantalla | Mapa | Panel | Ficha |
|---|---|---|---|
| Nave / escritorio (horizontal) | Pantalla completa; la escena se centra en lo que deja el panel | Columna derecha de ~440 px encima del mapa (como mucho el 34 % del ancho); debe caber entera; se esconde con la pestaña | Junto al punto |
| Móvil vertical (< 560 px de ancho) | Pantalla completa; la escena se centra en el 60 % superior | 40 % inferior encima del mapa, se desplaza por dentro; se esconde con la pestaña | Franja compacta (miniatura, porcentaje, nombre, franja y distancia), arriba o abajo según dónde esté el punto. La clave y la escala se ocultan mientras la franja está abajo |
| Pantalla baja (≤ 500 px de alto, móvil horizontal) | Sin botones de zoom (se usan los dedos) ni clave | Columna derecha, se desplaza por dentro | Franja compacta |
| Mapa 3D en < 560 px de ancho | Controles compactos: sin + / − (pellizco). «Globo de Marte» queda solo con la flecha. La vista 3D se encuadra más cerca y más desde arriba | — | Franja compacta |
| Globo de Marte (cualquier pantalla) | Pantalla completa | Oculto | — |

## Mapa 3D

El mapa principal es 3D (`src/components/mapa3d/`); el 2D queda como plan B si no hay WebGL o si la escena falla.

1. **Globo.** Marte con el color Viking, el relieve MOLA, una atmósfera fina (ocre de día, azulada en el terminador) y estrellas. Gale está señalado con una línea guía: un punto blanco sobre el cráter, una línea vertical fina con un codo y, arriba, «Cráter Gale» con «Entrar a la zona de estudio ›». Tocar el nombre (o el punto) baja a la zona de estudio; no hay descenso automático ni otros botones. El rótulo se oculta cuando Gale queda en la cara oculta. «‹ Globo de Marte», en el terreno, hace el mismo camino al revés. En el globo, Gale se ve como el resto del planeta, sin ningún recuadro más nítido ni en relieve con ningún zoom: su relieve solo aparece durante la bajada.
2. **Descenso.** Un solo movimiento continuo, sin paradas ni fundido a un color liso. El globo y el terreno son dos escenas, pero la cámara no se para en el cambio: lo cruza con el zoom a ritmo constante (`src/lib/mapa3d/transito.ts`). Por el globo, la cámara se orienta hacia Gale y se acerca en escala logarítmica (0,7 s más 0,3 s por unidad logarítmica de altura: unos 2,0 s desde la vista de inicio). Por el camino, por debajo de la altura mínima a la que se llega a mano, aparece la región de Gale en relieve (HRSC-MOLA, ×3) con su imagen CTX; mientras se ven sus bordes conserva el tinte del globo y, cuando ya llena la vista, toma el color y la luz del terreno. La cámara llega a la órbita baja a ~100 km sobre la zona de estudio (norte arriba, mirando casi a plomo) con el zoom en marcha. Se saca una foto de ese fotograma, se pone encima del lienzo y sigue acercándose al mismo ritmo mientras se monta la escena del terreno; el terreno empieza donde va la foto y a su ritmo, y las dos se funden (0,3 s) moviéndose juntas. Desde ahí la cámara baja en arco hasta la vista 3D (1,8 s). De tocar Gale a que entra el panel pasan unos 3,7 s. Al volver, lo mismo al revés: la cámara sube por el terreno (1,5 s), cruza la órbita baja sin pararse y el globo se aleja hasta su vista de inicio (1,8 s), unos 3,4 s en total; el relieve de Gale desaparece al subir.
3. **Terreno.** Datos reales hasta el horizonte, en tres niveles encajados que son muestreos de una misma superficie continua: cada uno se funde con el siguiente en una franja junto a su borde, así que no hay escalón ni plano liso donde «se acaba» el terreno.
   - Terreno local, 7,5 × 9,5 km: el DEM de 1 m reducido a 16 m, con HiRISE en color y, dentro de la zona de estudio, la imagen de más detalle (1,3 m/px en escritorio).
   - Entorno, 33 × 57 km: el mismo DEM a 64 m, con la ortofoto MSL.
   - Región de Gale, 237 km: el DEM HRSC-MOLA con el mosaico CTX. Su borde se prolonga hacia fuera hasta perderse en la bruma.

   Se ven el monte Sharp, el fondo del cráter y el borde en el horizonte. La ortofoto y el mosaico CTX son en gris y se colorean con la paleta del mosaico HiRISE en color: el color es aproximado, no medido, y no entran en ningún cálculo. Dentro de la zona de estudio la probabilidad tiñe el terreno en vez de taparlo (lo claro sigue claro y lo oscuro, oscuro), con algo de emisión para leerse igual en las laderas en sombra. De cerca (a menos de ~2 km) se añade un grano fino al color para que el suelo junto a la cámara no se vea liso. Hay cielo «butterscotch» y una bruma de polvo del mismo color que se aclara con la altura: mirando al horizonte se atraviesa mucho aire y el relieve lejano se funde con el cielo; mirando hacia abajo, aunque sea desde muy alto, el suelo se ve limpio (a 10 km la bruma tapa un 7 %). Sol del oestesuroeste a 32° (como en las imágenes HiRISE).
4. **Líneas.** Los contornos del 50 % y del 90 %, el borde de la zona de estudio y la regla en km (en los bordes sur y oeste, marcas cada 500 m y cifras cada km) son líneas apoyadas en el relieve con grosor constante en pantalla (`Lineas3D.tsx`): se ven igual de nítidas de lejos que a ras de suelo. El contorno del 50 % es claro y punteado y el del 90 %, ámbar, algo más gruesos que en el 2D (1,8 y 2,3 px) y con un halo oscuro. Antes iban pintados en la textura del terreno, y de cerca se volvían franjas borrosas y sus rótulos se leían al revés desde el norte.
5. **Vistas.** «3D» (oblicua desde el sursuroeste) y «Cenital» (norte arriba, sin giro: se lee como un plano y es la única con escala). El relieve es siempre el real.
6. **Etiquetas.** Son HTML y su tamaño no cambia con la distancia. El punto queda sobre un poste fino y el texto a un lado fijo por sitio, para que no se pisen. Los destinos de la misión propuestos llevan punto, los añadidos rombo, y el ámbar marca los que pasan del 50 %. Los puntos de referencia de Curiosity llevan anillo hueco y texto más apagado. La clave explica las dos marcas («Destino» y «Referencia»). Si aun así dos rótulos se juntan en pantalla (vista inclinada, sitios lejanos), se ve el de más prioridad (hábitat, destino nuevo, selección, destinos del 50 % o más, resto de destinos, puntos de referencia, rótulos de los contornos, cifras de la regla) y de los demás queda solo la marca, que se sigue pudiendo tocar. De lejos se simplifican: a partir de unos 13 km desaparecen los nombres (los destinos conservan su id y su porcentaje, y las referencias solo el anillo) y los rótulos de contornos y regla; a partir de unos 30 km solo quedan un único rótulo «Zona de estudio» y el borde de la zona.
7. **Destinos de la misión (decisión de la persona 3).** El plan empieza con seis destinos propuestos (M1–M6: cerros del norte, arenal del oeste, cresta clara, llano del noreste, terreno fracturado del sur y escarpe del este), elegidos sobre el DEM y la imagen HiRISE para que unos se alcancen el sol 1 y otros solo más tarde o nunca en 30 soles. Son una propuesta del equipo, no sitios de Curiosity, y se pueden quitar. Para añadir uno, el panel pide un punto con «Añadir destino en el mapa». En el mapa sale la barra «Toca el punto del destino nuevo», con cruz por cursor; al pasar por encima se ve la probabilidad, y «Cancelar» o Esc vuelven atrás. El punto elegido se marca con un rombo hueco rosa, «Destino nuevo · ponle nombre en el panel». Al guardar aparece como P1, P2… y su ficha muestra las tareas previstas, la ruta y el recorrido.

## Movimiento

- La zona alcanzable crece al cambiar de sol (550 ms, ease-in-out).
- **Cámara, lo que hace la persona** (anclada al suelo, como en un mapa; `src/lib/mapa3d/control.ts`):
  - Arrastrar mueve el mapa: el punto del suelo que se agarra sigue bajo el cursor o el dedo y, al soltar, el mapa sigue un poco por inercia, que se apaga en una fracción de segundo (constante de 0,24 s).
  - La rueda o el pellizco acercan o alejan hacia lo que hay bajo el cursor, que no se mueve de sitio (cada paso se reparte en unos fotogramas, 0,085 s).
  - El botón derecho, o arrastrar con Mayús, Alt, Ctrl o ⌘ pulsada, gira e inclina alrededor del punto del suelo del centro de la vista (arrastrar hacia arriba inclina hacia el horizonte).
  - Con los dedos: un dedo mueve, el pellizco acerca, girar los dos dedos cambia el rumbo y subir o bajar los dos a la vez inclina.
  - En cenital no se gira ni se inclina: el norte queda siempre arriba.
  - Teclas: + y − acercan y alejan, 0 vuelve a encuadrar la zona de estudio, C cambia entre 3D y cenital, las flechas eligen un punto de la malla y Esc cierra la ficha (o cancela la elección de un punto).
  - Límites: se puede bajar hasta 180 m, inclinar hasta 86° (casi el horizonte) y alejarse hasta 70 km. La cámara se mantiene al menos a 45 m sobre el relieve y nunca lo atraviesa. El punto de mira es siempre el punto del suelo del centro de la vista y puede recorrer todo el entorno. Sin rebotes.
- **Cámara, los movimientos automáticos** son vuelos de duración fija: llegada desde la órbita baja 1,8 s, subida a ella al salir 1,5 s, cambio de vista 0,95 s, volver al encuadre inicial (tecla 0 o al girar la pantalla) 0,7 s, ir a un destino pulsado en el panel 1,1 s (se acerca sin cambiar el rumbo y lo selecciona). Del globo al terreno, unos 3,7 s en total, y unos 3,4 s de vuelta (ver Descenso). Interpolan en esféricas alrededor del punto de mira, así que la cámara describe un arco, gira por el camino corto y la distancia cambia en escala logarítmica. Arrancan y frenan con aceleración nula (smootherstep), salvo el zoom de la llegada y de la salida en el extremo de la órbita baja, que mantiene su ritmo porque lo continúa la otra escena. Cualquier gesto los interrumpe, salvo durante la llegada y la salida, en las que los gestos están desactivados.
- **Globo:** giro y zoom amortiguados, más lentos cuanto más cerca.
- Las etiquetas no se ven durante la llegada y aparecen con un fundido de 0,6 s cuando la cámara se posa. Entre el globo y el terreno no hay fundido a un color: las escenas se cambian al cruzar la órbita baja, donde las dos muestran la misma vista, con un fundido cruzado de 0,3 s mientras las dos siguen acercándose.
- Fuera de eso, nada gira, late ni brilla; la brújula solo sigue a la cámara.
- Con `prefers-reduced-motion` no hay vuelos ni descenso: se salta directamente.

## Panel

El panel sigue el mismo estilo que el mapa. Las piezas comunes están en `src/components/panel/comun.tsx`: `CIFRA`, los colores de texto y borde, `Seccion`, `Deslizador`, `Despliegue`, `Casilla`, `MarcaDestino` y `Chevron`. Los textos y los formatos de número (coma decimal en español, punto en inglés) salen de `useIdioma()`, en `src/lib/i18n.ts`.

- **Estructura:** una columna sólida (`#0a0f1f`) que se lee de arriba abajo en tres bloques separados por un borde de 1 px: qué es (cabecera), la salida que se define (tres preguntas) y lo que el modelo responde para los destinos de la misión. Cada pregunta tiene título (15 px, peso 500), la respuesta actual a la derecha, una línea de ayuda que dice qué cambia en el mapa y su control. Los márgenes y la disposición siguen el ancho del propio panel, no el de la ventana.
- **Cabecera:** «Salida a pie», con una franja pequeña de la escala viridis, y «El color del mapa es la probabilidad de ir y volver con esta salida.»
- **«¿Qué sol?»:** deslizador del 1 al 30 con botones − y + a los lados para ir sol a sol; a la derecha, «sol 12 / 30» con la cifra en grande.
- **«¿Quién sale?»:** los ocho perfiles están siempre a la vista (dos columnas, cuatro si el panel es ancho), cada uno un botón con su id, su apellido y una casilla cuadrada. Un toque mete o saca a una persona (siempre sale al menos una); a la derecha, «1 persona», «Pareja» o «Grupo de n». Bajo cada perfil, una barra con hasta dónde puede ir y volver esa persona en llano ese sol (capa 3 con los valores centrales, en una escala de 0 a 4 km; no es la probabilidad del mapa). Con varias personas, una marca señala el alcance del grupo y la línea de abajo dice quién lo limita: «Alcance hoy en llano · limita …». «Perfiles» despliega la ficha de cada perfil: rol, arquetipo, VO₂ previo, masa y alcance de hoy en llano.
- **«¿A qué ritmo?»:** deslizador del 30 % al 50 % en pasos de 5, con «suave» y «exigente» en los extremos; a la derecha, «35 % de su capacidad aeróbica».
- **Destinos de la misión:** una fila por destino con el mismo marcador que el mapa (punto o rombo, ámbar si es ≥ 50 %), id, nombre, distancia, desnivel (flecha arriba o abajo y metros) y probabilidad de ir y volver. Bajo cada fila, una barra en la escala de color del mapa cortada en su probabilidad, con la marca del 50 % (como el contorno). «Ir y volver», en la cabecera del bloque, va subrayado con puntos: al pasar el ratón, al tocarlo o al llegar con el teclado se explica qué significa. Mientras se calcula una salida nueva, las cifras se atenúan. Los puntos de referencia T1–T6 no aparecen. Al pulsar una fila se despliegan su contexto, sus tareas previstas y «Quitar de la misión», queda marcada como activa (línea rosa a la izquierda, como la selección en el mapa) y el mapa vuela hasta ese destino y lo selecciona. También al revés: al tocar un destino de la misión en el mapa se despliega su fila y queda a la vista. «Añadir destino en el mapa» es un botón discontinuo con una cruz rosa. Mientras se elige el punto, el bloque lleva un borde rosa a la izquierda.
- **Estado del cálculo:** solo mientras se calcula, una barra de 2 px pegada al borde superior del panel (para lectores de pantalla, «Calculando el escenario»). No ocupa sitio, así que nada se mueve al arrastrar un deslizador. Arrastrar un deslizador no acumula cálculos: solo se calcula el último valor.
- **Deslizadores:** pista fina, relleno claro, marcas alineadas con el centro del tirador (16 × 24 px, blanco) y anillo rosa con el foco.
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
