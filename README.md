# Land & Stand

**El mapa de Marte según el cuerpo que lo pisa.** NASA Space Apps Challenge 2026 · Madrid · reto [*Interplanetary survival guide: Martian map*](https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/).

> *Every team will map Mars. We map Mars as it looks to a body just back from six months in zero gravity.*
 
Web de demostración que muestra, sobre el terreno real del cráter Gale, la probabilidad de que un astronauta recién llegado, o una pareja, pueda ir a pie a cada punto y volver, según el sol de misión. La capa cambia al cambiar de tripulante, de sol o de escenario de diseño.

## Arrancar

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # comprobar que compila antes de subir
```

Next.js 16 (App Router) + TypeScript + Tailwind 4. Ojo: Next 16 cambia APIs; ver `AGENTS.md` y `node_modules/next/dist/docs/`.

## Estructura

```
src/
├── app/page.tsx              # Monta todo: guarda el `estado` y pasa el `resultado`
├── lib/
│   ├── contract.ts           # ⚠️ EL CONTRATO (Estado, Resultado y mensajes del worker)
│   ├── constants.ts          # Constantes de la especificación y valores centrales
│   ├── data/targets.ts       # Hábitat, T1–T6, km→celda (truncando) y celda→lat/lon
│   ├── mock/resultadoFalso.ts# Resultado inventado mientras no hay cálculo real
│   └── model/                # PERSONA 1 · capas 2–6
│       ├── fisiologia.ts     #   capa 2
│       ├── marcha.ts         #   capa 3 (M2)
│       ├── grafo.ts          #   capa 4
│       ├── alcanzabilidad.ts #   capa 5 (Dijkstra ida + vuelta inverso)
│       ├── montecarlo.ts     #   capa 6
│       └── index.ts          #   calcular(): hoy devuelve el mock (MODELO_REAL = false)
├── workers/modelo.worker.ts  # Web Worker: recibe Estado y devuelve Resultado
├── hooks/useModelo.ts        # Conecta la UI con el worker (resultado, progreso)
└── components/
    ├── mapa/                 # PERSONA 2 · Mapa.tsx, Inspector.tsx
    └── panel/                # PERSONA 3 · sol, caminante, escenario, tabla, tarjetas, supuestos, créditos
public/
├── data/                     # DEM, HiRISE, targets, posteriores y sorteos (pendiente de Katrina)
└── fotos/                    # Fotos de Curiosity por destino
```

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

- Capas 1–6 de la especificación: fisiología, marcha con traje, grafo de 8 vecinos, Dijkstra de ida y vuelta (la vuelta sobre el grafo inverso) y Monte Carlo para tripulante, pareja y grupo.
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
- Selector de quién camina: tripulación seleccionable sin límite (una o más personas) a partir de los 8 perfiles precalculados previstos al aterrizaje.
- Selector de escenario: intensidad (por defecto 35 %; opciones fijas de 30, 35, 40, 45 y 50 %). La energía del traje queda fija en 6 h en esta vista.
- Tabla de destinos con distancia, desnivel y probabilidad; al pulsar un destino se despliega un resumen de sus tareas. Incluye el alta de destinos personalizados seleccionados sobre el mapa.
- Tarjetas con la foto de Curiosity («esto es lo que verás»). Los destinos se «encienden» al pasar del 50 %.
- Panel de supuestos siempre visible, créditos y barra de progreso mientras calcula.

## El contrato entre las tres partes

Es lo único que hay que acordar antes de separarse, y no se cambia después sin avisar a los otros dos.

```js
// La persona 3 lo modifica; la persona 1 lo recibe
estado = {
  sol,                                    // 1..30
  modo,                                   // "tripulante" | "pareja" | "grupo"
  tripulantes: [{ vo2pre, masa }],        // 1 en tripulante, 2 en pareja, 3+ en grupo (sin límite)
  fwalk,                                  // "U" (U(0,30;0,40)) | 0.30 | 0.35 | 0.40 | 0.45 | 0.50
  energiaHoras                            // 6 | 4
}

// La persona 1 lo devuelve; la persona 2 lo pinta en el mapa y la persona 3 en la tabla
resultado = {
  prob: Float32Array(12100),              // 110 × 110, fila 0 = SUR, columna 0 = oeste
  elevacion: Float32Array(12100),         // opcional: DEM en metros, fila 0 = SUR
  destinos: [{ id: "T3", p: 0.29 }, ...]
}
```

Mientras el cálculo no esté listo, las dos personas de lo visual trabajan con un `resultado` inventado, por ejemplo una probabilidad que baja con la distancia al hábitat. Así nadie espera a nadie.

## Decisiones tomadas

- **Nunca «seguro» ni «zona segura».** Se dice «alcanzable bajo los supuestos indicados». En la capa de aterrizaje, «zona apta según la regla de pendiente supuesta».
- **Solo el modelo M2.** El de Pandolf (M1) no reproduce los datos de Marte.
- **Perfiles fijos previstos (no editables in situ):** Como la herramienta es una solución predictiva para cuando la tripulación llega y no puede medir su VO₂ ni su masa en el terreno marciano, se utilizan 8 perfiles modelados (`src/lib/data/perfiles.ts`), no editables manualmente.
- **Modo Grupo añadido:** Permite coordinar expediciones de más de 2 astronautas caminando unidos; el radio conjunto queda limitado por el miembro más vulnerable del grupo.
- **Zona de estudio:** la ventana de 3,52 × 3,52 km del DEM de Gale con seis sitios de muestreo de Curiosity, no la zona de boxwork de la idea original.
- **Fuera de la demo:** radiación (RAD), meteorología (REMS), tormentas, lesión del compañero, CRISM y THEMIS. Se citan como «siguientes pasos» en el pitch.
- **Opcional:** la capa de aterrizaje (capa 7). Para la demo basta con superponer el mapa ya calculado en Python, sin hábitat arrastrable. La capa analítica (capa 9) no se implementa.
- **Plan B:** si el cálculo en el navegador no queda validado a tiempo, se precalculan los mapas en Python y se sirven como JSON con el mismo contrato. La interfaz no cambia.

## Perfiles de astronautas previstos al aterrizaje (`src/lib/data/perfiles.ts`)

| ID | Nombre y Rol | Arquetipo | VO₂pre (mL/kg/min) | Masa (kg) | Diagnóstico Operativo |
|---|---|---|:---:|:---:|---|
| **A1** | Dra. Elena Vega (Comandante) | Atleta de élite | 55,0 | 68 | Superdotada cardiovascular. Apta NASA desde el Sol 1. Máximo alcance (> 2,6 km). |
| **A2** | Dr. Marcus Vance (Especialista) | Estándar ISS / Medio | 40,6 | 75 | Perfil canónico de referencia. Apto NASA a partir del Sol 7. |
| **A3** | Ing. Lars Lindholm (Carga) | Fuerza / Masa pesada | 44,0 | 92 | Gran motor aeróbico, pero masa alta; limita la energía del traje antes que el tiempo. |
| **A4** | Dra. Yasmine Al-Mansoor (Geóloga) | Ligera / Alta eficiencia | 46,0 | 54 | Mínimo consumo metabólico; máxima autonomía energética para travesías largas. |
| **A5** | Dr. Alexei Morozov (Astrobiólogo) | Límite reglamentario | 36,5 | 78 | Límite previo NASA. Cae a 31 mL/kg/min post-aterrizaje; tarda semanas en recuperarse. |
| **A6** | Dra. Chloe Bennett (Piloto) | Déficit de equilibrio | 48,0 | 70 | Gran resistencia pero afectación vestibular; bloqueada ante colinas empinadas. |
| **A7** | Téc. Kenji Sato (Robótica) | Alto desacondicionamiento | 33,0 | 86 | Fuerte caída por ingravidez (-24%). Cuello de botella en salidas en grupo. |
| **A8** | Dra. Sarah O'Connor (Médico) | Readaptación rápida | 43,0 | 65 | Recuperación biológica acelerada (tauA = 6 soles); al Sol 3 ya está al 95%. |

## Pendiente

- [ ] **Pedir a Katrina** la carpeta `data/` (`dem_real.npy`, `aoi_color.jpg`, posteriores), `docs/targets/targets.json`, `results/draws_seed11_300.json` y `results/real_prob_con.npy`. Pedir también el repo de Python (`src/landstand/`), si lo tiene. Sin `data/` no se puede empezar el cálculo real.
- [ ] Sustituir la elevación provisional del mock (`src/lib/mock/elevacionFalsa.ts`) por el DEM real cuando esté disponible.
- [ ] Decidir entre calcular en el navegador (lo que pide la especificación) o precalcular en Python.
- [ ] Comprobar en el enunciado si DEM, HiRISE y posiciones y fotos de Curiosity cuentan como los tres tipos de datos mínimos.
- [ ] Elegir el stack de la web.
- [x] Definir los tripulantes ficticios de la demo (8 perfiles en `src/lib/data/perfiles.ts`, no editables in situ por premisa predictiva).
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
