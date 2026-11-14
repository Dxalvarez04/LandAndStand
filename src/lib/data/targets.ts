import type { IdDestino, Resultado } from "@/lib/contract";
import { CELDA_KM, CELDA_M, N, R_MARTE, X0, Y0 } from "@/lib/constants";

/**
 * Hábitat, puntos de referencia y destinos de la misión (sección 1). Coordenadas en km desde la
 * esquina suroeste.
 *
 *   - Puntos de referencia (DESTINOS, T1–T6): sitios que visitó Curiosity, con su foto. Orientan en
 *     el mapa (como landmarks) y su probabilidad sigue llegando en `Resultado.destinos`, pero NO son
 *     los destinos de la misión.
 *   - Destinos de la misión (DESTINOS_MISION, M1–M6): lo que la tripulación planea visitar; es lo que
 *     lista el panel. Son una PROPUESTA del equipo, no sitios de Curiosity: se eligieron sobre el DEM
 *     y la imagen HiRISE para cubrir varias direcciones, distancias y desniveles (unos se alcanzan el
 *     sol 1 y otros solo más adelante o nunca en 30 soles). La tripulación puede quitarlos y añadir
 *     los suyos (P1, P2…).
 *
 * Cuando llegue `targets.json` de Katrina, sustituir DESTINOS por la carga de ese archivo
 * (incluye foto y créditos PIA).
 */
export interface Sitio {
  id: string;
  nombre: string;
  northKm: number;
  eastKm: number;
  /** Distancia en línea recta desde el centro de la celda del hábitat (km) */
  distanciaKm: number;
  /** Desnivel neto respecto al hábitat (m) */
  desnivelM: number;
  /** Contexto geológico o relevancia científica */
  contexto: string;
  /** Identificador PIA oficial de NASA/JPL */
  pia: string;
  /** Ruta en /public/fotos */
  foto?: string;
}

/** Punto de referencia (sitio de Curiosity, T1–T6). */
export interface Destino extends Sitio {
  id: IdDestino;
  /** Lo que se estudió allí; se ofrece como tareas al añadirlo a la misión. */
  tareas: string[];
}

/** Destino de la misión: propuesto (M1…) o añadido por la tripulación en el mapa (P1…). */
export interface DestinoMision {
  id: string;
  nombre: string;
  fila: number;
  columna: number;
  /** Tareas previstas. La lista no tiene mínimo ni máximo. */
  tareas: string[];
  /** Qué hay allí (en los propuestos, sacado del DEM y la imagen HiRISE) */
  contexto?: string;
  /** true en los destinos propuestos (M1…); los añadidos por la tripulación no lo llevan */
  propuesto?: boolean;
}

export const HABITAT: Omit<Sitio, "distanciaKm" | "desnivelM" | "pia"> & { id: string } = {
  id: "H",
  nombre: "Hábitat",
  northKm: 2.7,
  eastKm: 1.36,
  contexto: "Roca de la formación Murray junto a dunas Bagnold",
};

export const DESTINOS: Destino[] = [
  {
    id: "T1",
    nombre: "Ogunquit Beach",
    northKm: 2.621,
    eastKm: 1.018,
    distanciaKm: 0.33,
    desnivelM: 0,
    contexto: "Campo de dunas oscuras Bagnold",
    pia: "PIA21644",
    tareas: [
      "Medir ondulaciones y dirección del viento en la duna.",
      "Recoger una muestra de arena para granulometría.",
      "Fotografiar la estratificación cruzada de las dunas.",
    ],
  },
  {
    id: "T2",
    nombre: "Ireson Hill",
    northKm: 2.8,
    eastKm: 0.825,
    distanciaKm: 0.53,
    desnivelM: -14,
    contexto: "Cerro testigo aislado en la llanura",
    pia: "PIA21262",
    tareas: [
      "Levantar la columna estratigráfica del cerro testigo.",
      "Muestrear la arenisca resistente de la cima.",
    ],
  },
  {
    id: "T3",
    nombre: "Rock Hall",
    northKm: 1.725,
    eastKm: 2.049,
    distanciaKm: 1.19,
    desnivelM: 157,
    contexto: "Cresta Vera Rubin Ridge (subida exigente)",
    pia: "PIA23000",
    tareas: [
      "Muestrear la arenisca hematítica de Vera Rubin Ridge.",
      "Medir el buzamiento y la fracturación de los estratos.",
      "Documentar concreciones y cambios de color.",
      "Comparar la secuencia con Glen Torridon.",
    ],
  },
  {
    id: "T4",
    nombre: "Aberlady/Kilmarie",
    northKm: 1.863,
    eastKm: 2.375,
    distanciaKm: 1.32,
    desnivelM: 142,
    contexto: "Unidad rica en arcillas de Glen Torridon",
    pia: "PIA23184",
    tareas: [
      "Recoger una muestra de lutita rica en arcillas.",
      "Analizar minerales de alteración y materia orgánica.",
      "Cartografiar la transición hacia la unidad de sulfatos.",
    ],
  },
  {
    id: "T5",
    nombre: "Edinburgh",
    northKm: 1.212,
    eastKm: 2.205,
    distanciaKm: 1.71,
    desnivelM: 211,
    contexto: "Escarpe del pedimento Greenheugh",
    pia: "PIA23846",
    tareas: [
      "Medir la discordancia del pedimento Greenheugh.",
      "Muestrear el conglomerado del escarpe.",
    ],
  },
  {
    id: "T6",
    nombre: "Mary Anning",
    northKm: 1.672,
    eastKm: 2.818,
    distanciaKm: 1.79,
    desnivelM: 171,
    contexto: "Lecho lacustre antiguo en Glen Torridon",
    pia: "PIA24177",
    tareas: [
      "Muestrear la lutita laminada del lecho lacustre.",
      "Analizar la química de los sedimentos finos.",
      "Registrar estructuras sedimentarias y posibles biofirmas.",
      "Fotografiar la laminación a escala centimétrica.",
    ],
  },
];

/**
 * Destinos de la misión propuestos (ver la cabecera). Probabilidad orientativa para el grupo por
 * defecto (A2, A1, A4) al 35 % de marcha, sol 1 → sol 30:
 *   M1 100 → 100 · M2 75 → 100 · M3 73 → 100 · M4 38 → 77 · M5 12 → 54 · M6 0 → 16 %.
 */
export const DESTINOS_MISION: DestinoMision[] = [
  {
    id: "M1",
    nombre: "Cerros del norte",
    ...celdaDeKm(3.12, 1.808),
    contexto: "Cerros de roca clara a 0,6 km al norte, casi a la altura del hábitat",
    tareas: [
      "Instalar la estación meteorológica.",
      "Probar el enlace de radio con el hábitat.",
      "Fotografiar los cerros para el mapa de la zona.",
    ],
    propuesto: true,
  },
  {
    id: "M2",
    nombre: "Arenal del oeste",
    ...celdaDeKm(2.416, 0.272),
    contexto: "Arena oscura junto a un bloque de roca clara, en llano, a 1,1 km al oeste",
    tareas: [
      "Recoger regolito para las pruebas de extracción de agua.",
      "Medir el espesor de la capa de arena.",
      "Comprobar si el terreno es practicable para el rover.",
    ],
    propuesto: true,
  },
  {
    id: "M3",
    nombre: "Cresta clara",
    ...celdaDeKm(1.936, 1.52),
    contexto: "Lo alto de la cresta de roca clara al sur del hábitat, unos 100 m por encima",
    tareas: [
      "Instalar un repetidor de radio en lo alto.",
      "Fotografiar la panorámica de la zona de estudio.",
      "Muestrear la roca clara de la cresta.",
    ],
    propuesto: true,
  },
  {
    id: "M4",
    nombre: "Llano del noreste",
    ...celdaDeKm(3.312, 2.704),
    contexto: "Llano de pendiente suave (en torno al 5 %) a 1,5 km al noreste",
    tareas: [
      "Reconocer el llano como zona de aterrizaje de carga.",
      "Medir la pendiente y buscar bloques sueltos.",
      "Colocar balizas de referencia.",
    ],
    propuesto: true,
  },
  {
    id: "M5",
    nombre: "Terreno fracturado del sur",
    ...celdaDeKm(1.424, 0.976),
    contexto: "Terreno fracturado detrás de la cresta, unos 120 m por encima del hábitat",
    tareas: ["Desplegar un sismómetro.", "Cartografiar las fracturas.", "Muestrear el relleno de las fracturas."],
    propuesto: true,
  },
  {
    id: "M6",
    nombre: "Escarpe del este",
    ...celdaDeKm(2.32, 3.088),
    contexto: "Borde de la meseta clara del este, unos 140 m por encima del hábitat",
    tareas: [
      "Fotografiar el escarpe desde su base.",
      "Muestrear la roca del borde de la meseta.",
      "Buscar una ruta de subida para salidas futuras.",
    ],
    propuesto: true,
  },
];

/** km → celda (fila, columna), para declarar los destinos en km como los demás sitios. */
function celdaDeKm(northKm: number, eastKm: number) {
  const { fila, columna } = kmACelda(northKm, eastKm);
  return { fila, columna };
}

/** km → celda, TRUNCANDO como en Python (`int()`), nunca redondeando. */
export function kmACelda(northKm: number, eastKm: number) {
  return { fila: Math.trunc(northKm / CELDA_KM), columna: Math.trunc(eastKm / CELDA_KM) };
}

/** Celda del centro del hábitat, usada como origen de distancias y desniveles. */
export const HABITAT_CELDA = kmACelda(HABITAT.northKm, HABITAT.eastKm);

/** Distancia en línea recta entre centros de celda (km). */
export function distanciaDesdeHabitatKm(fila: number, columna: number): number {
  return Math.hypot(fila - HABITAT_CELDA.fila, columna - HABITAT_CELDA.columna) * CELDA_KM;
}

/** Desnivel neto respecto al hábitat (m). `null` si el resultado aún no trae DEM. */
export function desnivelDesdeHabitatM(
  resultado: Resultado | null,
  fila: number,
  columna: number,
): number | null {
  const elevacion = resultado?.elevacion;
  if (!elevacion) return null;
  const indiceHabitat = HABITAT_CELDA.fila * N + HABITAT_CELDA.columna;
  const indice = fila * N + columna;
  return Math.round(elevacion[indice] - elevacion[indiceHabitat]);
}

/** Latitud y longitud del centro de una celda (para el inspector). */
export function celdaALatLon(fila: number, columna: number) {
  const x = X0 + (columna + 0.5) * CELDA_M;
  const y = Y0 + (fila + 0.5) * CELDA_M;
  return { lat: ((y / R_MARTE) * 180) / Math.PI, lon: ((x / R_MARTE) * 180) / Math.PI };
}
