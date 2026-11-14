import type { IdDestino, Resultado } from "@/lib/contract";
import { CELDA_KM, CELDA_M, N, R_MARTE, X0, Y0 } from "@/lib/constants";

/**
 * Hábitat y destinos (sección 1). Coordenadas en km desde la esquina suroeste.
 * Cuando llegue `targets.json` de Katrina, sustituir por la carga de ese archivo
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

export interface Destino extends Sitio {
  id: IdDestino;
  /** Resumen breve de las tareas previstas. La lista no tiene mínimo ni máximo. */
  tareas: string[];
}

/** Destino añadido por el usuario haciendo clic en el mapa. */
export interface DestinoPersonalizado {
  id: string;
  nombre: string;
  fila: number;
  columna: number;
  tareas: string[];
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
