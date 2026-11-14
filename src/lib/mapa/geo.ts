/**
 * ÚNICA fuente de verdad para las coordenadas del mapa.
 *
 * - "Celda" (fila, columna): convenio del modelo. Fila 0 = SUR, columna 0 = oeste.
 * - "Mundo" (x, y): cuadrado de N × N unidades (1 unidad = 1 celda = 32 m) tal como se ve
 *   en pantalla: x hacia el este, y hacia ABAJO, y = 0 en el borde NORTE.
 *   El centro de la celda (fila, columna) está en (columna + 0,5; N − fila − 0,5).
 * - "Pantalla": píxeles del contenedor = mundo · (tamaño / N), y luego el zoom.
 *
 * Aquí, y solo aquí, se invierten las filas.
 */
import { CELDA_KM, CELDA_M, N } from "@/lib/constants";
import { HABITAT, kmACelda } from "@/lib/data/targets";

export interface Celda {
  fila: number;
  columna: number;
}
export interface Punto {
  x: number;
  y: number;
}

export const indice = ({ fila, columna }: Celda) => fila * N + columna;
export const celdaDeIndice = (i: number): Celda => ({ fila: Math.floor(i / N), columna: i % N });

/** Centro de la celda en coordenadas de mundo. */
export function celdaAMundo({ fila, columna }: Celda): Punto {
  return { x: columna + 0.5, y: N - fila - 0.5 };
}

/** Celda que contiene un punto del mundo, o null si cae fuera de la ventana. */
export function mundoACelda({ x, y }: Punto): Celda | null {
  if (x < 0 || y < 0 || x >= N || y >= N) return null;
  return { fila: N - 1 - Math.floor(y), columna: Math.floor(x) };
}

/** Posición exacta en el mundo de un punto dado en km desde la esquina suroeste. */
export function kmAMundo(northKm: number, eastKm: number): Punto {
  return { x: eastKm / CELDA_KM, y: N - northKm / CELDA_KM };
}

export const CELDA_HABITAT: Celda = kmACelda(HABITAT.northKm, HABITAT.eastKm);

/** Distancia en línea recta entre centros de celda, en metros. */
export function distanciaM(a: Celda, b: Celda): number {
  return Math.hypot(a.fila - b.fila, a.columna - b.columna) * CELDA_M;
}

/** Limita una celda a la malla. */
export function acotar({ fila, columna }: Celda): Celda {
  const c = (v: number) => Math.max(0, Math.min(N - 1, v));
  return { fila: c(fila), columna: c(columna) };
}
