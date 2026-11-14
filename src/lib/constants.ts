/** Constantes de la especificación (docs/especificacion_algoritmos.md). */

// ---- Malla (sección 1) ----
export const N = 110; // filas = columnas
export const CELDA_M = 32;
export const CELDA_KM = 0.032;
export const R_MARTE = 3_396_190; // m
export const X0 = 8_141_000; // m, borde oeste
export const Y0 = -282_000; // m, borde sur

// ---- Marcha (sección 3) ----
export const KJ_PER_L = 20.1;

// ---- Alcanzabilidad (sección 5) ----
export const T_EVA = 6 * 3600; // s
export const RHO = 0.2;
export const T_TASK = 1800; // s
export const P_TASK = 300; // W
export const P_DES = 352; // W

// ---- Valores centrales (sección 6) ----
export const CENTRALES = {
  vo2pre: 40.6,
  masa: 75,
  delta: 0.16,
  tauA: 15,
  tauB: 0.95,
  fWalk: 0.35,
  thLim: 25,
  dTh: 7.5,
  vFlat: 1.0,
  ref2: 29,
  rest2: 5,
  vRef: 0.75,
} as const;

/** Umbral por debajo del cual la capa de probabilidad es transparente. */
export const PROB_MIN_VISIBLE = 0.02;
