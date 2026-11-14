# Land & Stand

**El mapa de Marte según el cuerpo que lo pisa.** NASA Space Apps Challenge 2026 · Madrid · reto [*Interplanetary survival guide: Martian map*](https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/).

> *Every team will map Mars. We map Mars as it looks to a body just back from six months in zero gravity.*
 
Web de demostración que muestra, sobre el terreno real del cráter Gale, la probabilidad de que un astronauta recién llegado, o una pareja, pueda ir a pie a cada punto y volver, según el sol de misión. La capa cambia al cambiar de tripulante, de sol o de escenario de diseño.

## Documentos

| Archivo | Qué contiene |
|---|---|
| [`docs/especificacion_algoritmos.md`](docs/especificacion_algoritmos.md) | **La referencia para programar.** Las capas de la herramienta, sus fórmulas, el protocolo de validación y los errores típicos. |
| [`docs/especificacion_algoritmos.docx`](docs/especificacion_algoritmos.docx) | El original de la especificación, con figuras. |
| [`docs/informe_tecnico.md`](docs/informe_tecnico.md) | Informe técnico revisado: modelo, resultados, limitaciones, guion del vídeo, diapositivas y preguntas del jurado. |
| [`docs/idea_original.md`](docs/idea_original.md) | La propuesta inicial y qué ha cambiado desde entonces. |

## Equipo y reparto

Tres personas desarrollan la herramienta. Katrina Espinar es la autora del modelo y la referencia científica, pero no participa en el desarrollo.

### Persona 1 · Cálculo (capa fisiológica sobre el terreno)

- Capas 1–6 de la especificación: fisiología, marcha con traje, grafo de 8 vecinos, Dijkstra de ida y vuelta (la vuelta sobre el grafo inverso) y Monte Carlo para población, tripulante y pareja.
- Corre en un Web Worker: recibe `estado` y devuelve `resultado` (ver más abajo).
- **Terminado cuando** reproduce el protocolo de validación de la sección 10: llano el sol 1 ≈ 0,22 m/s y ≈ 1,7 km; Rock Hall = 0,290 el sol 1 con `draws_seed11_300.json`.
- Si Katrina comparte el repo de Python, el trabajo se reduce a exportar las capas ya calculadas a JSON.

### Persona 2 · Visual: el mapa

- Fondo HiRISE y capa de probabilidad en viridis, transparente por debajo del 2 %.
- Contornos del 50 % y del 90 % (*marching squares*, por ejemplo con d3-contour).
- Hábitat y destinos T1–T6 con su porcentaje.
- Inspector al hacer clic en una celda: coordenadas, probabilidad y ruta ilustrativa de ida y vuelta.
- Animación al cambiar de sol.
- ⚠️ El DEM tiene el **sur en la fila 0**, pero la imagen tiene el **norte arriba**: hay que invertir las filas al pintar.

### Persona 3 · Visual: el panel y los destinos

- Deslizador de sol (1–30).
- Selector de quién camina: población, tripulante editable o pareja.
- Selectores de escenario: intensidad (por defecto entre el 30 y el 40 %, o fija en 30, 35, 40, 47 o 50 %) y energía del traje (6 h o 4 h).
- Tabla de destinos con distancia, desnivel y probabilidad.
- Tarjetas con la foto de Curiosity («esto es lo que verás»). Los destinos se «encienden» al pasar del 50 %.
- Panel de supuestos siempre visible, créditos y barra de progreso mientras calcula.

## El contrato entre las tres partes

Es lo único que hay que acordar antes de separarse, y no se cambia después sin avisar a los otros dos.

```js
// La persona 3 lo modifica; la persona 1 lo recibe
estado = {
  sol,                                    // 1..30
  modo,                                   // "poblacion" | "tripulante" | "pareja"
  tripulantes: [{ vo2pre, masa }],        // 1 en modo tripulante, 2 en modo pareja
  fwalk,                                  // "U" (U(0,30;0,40)) | 0.30 | 0.35 | 0.40 | 0.47 | 0.50
  energiaHoras                            // 6 | 4
}

// La persona 1 lo devuelve; la persona 2 lo pinta en el mapa y la persona 3 en la tabla
resultado = {
  prob: Float32Array(12100),              // 110 × 110, fila 0 = SUR, columna 0 = oeste
  destinos: [{ id: "T3", p: 0.29 }, ...]
}
```

Mientras el cálculo no esté listo, las dos personas de lo visual trabajan con un `resultado` inventado, por ejemplo una probabilidad que baja con la distancia al hábitat. Así nadie espera a nadie.

## Decisiones tomadas

- **Nunca «seguro» ni «zona segura».** Se dice «alcanzable bajo los supuestos indicados». En la capa de aterrizaje, «zona apta según la regla de pendiente supuesta».
- **Solo el modelo M2.** El de Pandolf (M1) no reproduce los datos de Marte.
- **Zona de estudio:** la ventana de 3,52 × 3,52 km del DEM de Gale con seis sitios de muestreo de Curiosity, no la zona de boxwork de la idea original.
- **Fuera de la demo:** radiación (RAD), meteorología (REMS), tormentas, lesión del compañero, CRISM y THEMIS. Se citan como «siguientes pasos» en el pitch.
- **Opcional:** la capa de aterrizaje (capa 7). Para la demo basta con superponer el mapa ya calculado en Python, sin hábitat arrastrable. La capa analítica (capa 9) no se implementa.
- **Plan B:** si el cálculo en el navegador no queda validado a tiempo, se precalculan los mapas en Python y se sirven como JSON con el mismo contrato. La interfaz no cambia.

## Pendiente

- [ ] **Pedir a Katrina** la carpeta `data/` (`dem_real.npy`, `aoi_color.jpg`, posteriores), `docs/targets/targets.json`, `results/draws_seed11_300.json` y `results/real_prob_con.npy`. Pedir también el repo de Python (`src/landstand/`), si lo tiene. Sin `data/` no se puede empezar el cálculo real.
- [ ] Decidir entre calcular en el navegador (lo que pide la especificación) o precalcular en Python.
- [ ] Comprobar en el enunciado si DEM, HiRISE y posiciones y fotos de Curiosity cuentan como los tres tipos de datos mínimos.
- [ ] Elegir el stack de la web.
- [ ] Definir los tripulantes ficticios de la demo (VO₂máx previo y masa).
- [ ] Fotos de Curiosity de cada destino, con su número PIA.

## Hitos

1. Contrato acordado. Mapa y panel funcionando con datos inventados. Paso 1 de validación superado.
2. Cálculo real integrado en la interfaz y paso 2 de validación superado.
3. Código congelado unas horas antes del cierre y vídeo grabado con la versión final.

## Créditos de datos (deben aparecer en la herramienta)

- **Terreno:** USGS Astrogeology, MSL Gale Merged DEM 1 m v3 (Calef y Parker, 2016).
- **Imagen:** HiRISE, NASA/JPL-Caltech/University of Arizona.
- **Posiciones de los destinos:** NASA/JPL-Caltech, archivo de posiciones de Curiosity.
- **Fotos de los destinos:** NASA/JPL-Caltech/MSSS, con su número PIA.
