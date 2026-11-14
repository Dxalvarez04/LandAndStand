import type { IdDestino } from "@/lib/contract";
import { CELDA_KM, CELDA_M, R_MARTE, X0, Y0 } from "@/lib/constants";

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
  /** Ruta en /public/fotos; pendiente */
  foto?: string;
  pia?: string;
}

export const HABITAT: Sitio = { id: "H", nombre: "Hábitat", northKm: 2.7, eastKm: 1.36 };

export const DESTINOS: (Sitio & { id: IdDestino })[] = [
  { id: "T1", nombre: "Ogunquit Beach", northKm: 2.621, eastKm: 1.018 },
  { id: "T2", nombre: "Ireson Hill", northKm: 2.8, eastKm: 0.825 },
  { id: "T3", nombre: "Rock Hall", northKm: 1.725, eastKm: 2.049 },
  { id: "T4", nombre: "Aberlady/Kilmarie", northKm: 1.863, eastKm: 2.375 },
  { id: "T5", nombre: "Edinburgh", northKm: 1.212, eastKm: 2.205 },
  { id: "T6", nombre: "Mary Anning", northKm: 1.672, eastKm: 2.818 },
];

/** km → celda, TRUNCANDO como en Python (`int()`), nunca redondeando. */
export function kmACelda(northKm: number, eastKm: number) {
  return { fila: Math.trunc(northKm / CELDA_KM), columna: Math.trunc(eastKm / CELDA_KM) };
}

/** Latitud y longitud del centro de una celda (para el inspector). */
export function celdaALatLon(fila: number, columna: number) {
  const x = X0 + (columna + 0.5) * CELDA_M;
  const y = Y0 + (fila + 0.5) * CELDA_M;
  return { lat: ((y / R_MARTE) * 180) / Math.PI, lon: ((x / R_MARTE) * 180) / Math.PI };
}
