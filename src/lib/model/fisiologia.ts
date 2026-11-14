/**
 * CAPA 2 · Fisiología (sección 2 de la especificación).
 *   vo2max(s)    = VO2pre · (1 − δ · exp(−s / τa))
 *   theta_max(s) = th_lim − d_th · exp(−s / τb)
 */
import type { Parametros } from "./tipos";

/**
 * Capacidad aeróbica máxima (mL/kg/min) en función del sol transcurrido.
 *
 * @param s Sol transcurrido desde el aterrizaje (s = 1 es el primer día en Marte).
 * @param p Parámetros que contienen vo2pre (VO₂ previo), delta (déficit inicial) y tauA (constante de recuperación aeróbica).
 * @returns vo2max del día en mL/kg/min.
 */
export function vo2max(
  s: number,
  p: Pick<Parametros, "vo2pre" | "delta" | "tauA"> | Parametros,
): number {
  return p.vo2pre * (1 - p.delta * Math.exp(-s / p.tauA));
}

/**
 * Pendiente máxima transitable por equilibrio (grados) en función del sol transcurrido.
 *
 * @param s Sol transcurrido desde el aterrizaje (s = 1 es el primer día en Marte).
 * @param p Parámetros que contienen thLim (ángulo límite de equilibrio), dTh (déficit angular inicial) y tauB (constante de recuperación sensoriomotora).
 * @returns theta_max del día en grados sexagesimales.
 */
export function thetaMax(
  s: number,
  p: Pick<Parametros, "thLim" | "dTh" | "tauB"> | Parametros,
): number {
  return p.thLim - p.dTh * Math.exp(-s / p.tauB);
}

