/**
 * Coordenadas del mapa 3D. Complementa src/lib/mapa/geo.ts (que sigue siendo la única fuente de la
 * inversión de filas para la malla 110 × 110).
 *
 * - Proyectadas: metros en la proyección equirectangular de Marte (meridiano central 0, R = 3 396 190 m),
 *   «este» y «norte», igual que X0/Y0 de la especificación.
 * - Escena del terreno: metros con origen en el centro de la zona de estudio; x = este, z = SUR (−norte),
 *   y = altura sobre el hábitat (relieve real, sin exagerar).
 * - Globo: esfera de radio 1 con el mismo convenio que THREE.SphereGeometry y una textura
 *   equirectangular con u = 0 en la longitud −180°.
 */
import { CELDA_M, N, R_MARTE, X0, Y0 } from "@/lib/constants";
import type { Celda, Punto } from "@/lib/mapa/geo";

export const LADO_M = N * CELDA_M;
/** Centro de la zona de estudio, en proyectadas */
export const XC = X0 + LADO_M / 2;
export const YC = Y0 + LADO_M / 2;

export const aEscena = (este: number, norte: number) => ({ x: este - XC, z: YC - norte });
export const deEscena = (x: number, z: number) => ({ este: x + XC, norte: YC - z });

export function celdaAProyectadas({ fila, columna }: Celda) {
  return { este: X0 + (columna + 0.5) * CELDA_M, norte: Y0 + (fila + 0.5) * CELDA_M };
}

export function proyectadasACelda(este: number, norte: number): Celda | null {
  const columna = Math.floor((este - X0) / CELDA_M);
  const fila = Math.floor((norte - Y0) / CELDA_M);
  if (columna < 0 || fila < 0 || columna >= N || fila >= N) return null;
  return { fila, columna };
}

/** Punto en coordenadas de «mundo» de geo.ts (x este en celdas, y hacia abajo desde el norte) → proyectadas. */
export const mundoAProyectadas = (p: Punto) => ({ este: X0 + p.x * CELDA_M, norte: Y0 + (N - p.y) * CELDA_M });

/** Latitud y longitud (grados) de un punto en proyectadas. */
export const proyectadasALatLon = (este: number, norte: number) => ({
  lat: (norte / R_MARTE) * (180 / Math.PI),
  lon: (este / R_MARTE) * (180 / Math.PI),
});

/** Vector sobre la esfera (radio r) para una latitud y longitud, con el convenio de THREE.SphereGeometry. */
export function latLonAVector(lat: number, lon: number, r = 1): [number, number, number] {
  const la = (lat * Math.PI) / 180;
  const fi = ((lon + 180) * Math.PI) / 180;
  return [-Math.cos(fi) * Math.cos(la) * r, Math.sin(la) * r, Math.sin(fi) * Math.cos(la) * r];
}

/** Centro del cráter Gale (aprox.) y de la zona de estudio, en grados. */
export const GALE = { lat: -5.4, lon: 137.8 };
export const ZONA = proyectadasALatLon(XC, YC);
