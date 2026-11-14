/**
 * CAPA 2 · Fisiología (sección 2 de la especificación).
 *   vo2max(s)    = VO2pre · (1 − δ · exp(−s / τa))
 *   theta_max(s) = th_lim − d_th · exp(−s / τb)
 */
import type { Parametros } from "./tipos";

export function vo2max(_s: number, _p: Parametros): number {
  throw new Error("TODO persona 1: capa 2, vo2max");
}

export function thetaMax(_s: number, _p: Parametros): number {
  throw new Error("TODO persona 1: capa 2, thetaMax");
}
