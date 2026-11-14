/**
 * CAPA 3 · Marcha con traje, modelo M2 (sección 3).
 * Minetti (ratio), Tobler acotado, v_met, tope de bajada y potencia DESPUÉS del tope.
 */
import { KJ_PER_L, P_DES, P_TASK, RHO, T_EVA, T_TASK } from "@/lib/constants";
import { vo2max } from "./fisiologia";
import type { Parametros } from "./tipos";

/**
 * Curva empírica de coste de marcha en pendiente (Minetti et al., 2002).
 *
 * @param G Pendiente en tanto por ciento (%) = 100 * Δz / dist.
 * @returns ratio relativo respecto al coste en llano (en G = 0 devuelve 1.0).
 */
export function ratio(G: number): number {
  const i = Math.max(-0.45, Math.min(0.45, G / 100));
  const C =
    280.5 * Math.pow(i, 5) -
    58.7 * Math.pow(i, 4) -
    76.8 * Math.pow(i, 3) +
    51.9 * Math.pow(i, 2) +
    19.6 * i +
    2.5;
  return Math.max(C, 0.5) / 2.5;
}

/**
 * Velocidad máxima permitida por el terreno (Tobler normalizada y acotada).
 *
 * @param S Pendiente adimensional (S = G / 100).
 * @param vFlat Velocidad máxima en llano (m/s).
 * @returns Velocidad máxima por terreno en m/s.
 */
export function tobler(S: number, vFlat: number): number {
  const exponent = -3.5 * (Math.abs(S + 0.05) - 0.05);
  return Math.min(vFlat, vFlat * Math.exp(exponent));
}

/**
 * Velocidad sostenible (m/s) y potencia metabólica (W) en pendiente G (%) para el sol s.
 * Aplica el tope de bajada (nadie baja más deprisa que en llano) y calcula P con la V final.
 *
 * @param G Pendiente en % (100 * Δz / dist).
 * @param s Sol transcurrido desde el aterrizaje (s >= 1).
 * @param p Parámetros del astronauta y del traje.
 * @returns { V, P } donde V es m/s y P son vatios.
 */
export function marcha(
  G: number,
  s: number,
  p: Parametros,
): { V: number; P: number } {
  const rG = ratio(G);
  const cap = p.fWalk * vo2max(s, p);
  const deltaCoste = p.ref2 - p.rest2;

  // Velocidad metabólica máxima permitida por la capacidad disponible
  const denom = deltaCoste * rG;
  const vMet = denom > 0 ? Math.max(0, (p.vRef * (cap - p.rest2)) / denom) : 0;

  // Velocidad biomecánica según relieve (Tobler)
  const vTobler = tobler(G / 100, p.vFlat);

  let V = Math.min(vTobler, vMet);

  // Tope de bajada: si G < 0, la velocidad no puede superar la velocidad en llano
  if (G < 0) {
    const r0 = 1.0; // ratio(0) = 1.0
    const vMet0 = Math.max(0, (p.vRef * (cap - p.rest2)) / (deltaCoste * r0));
    const vTobler0 = tobler(0, p.vFlat);
    const vLlano = Math.min(vTobler0, vMet0);
    V = Math.min(V, vLlano);
  }

  // Potencia metabólica evaluada DESPUÉS de aplicar el tope, con la velocidad final V
  const vo2Consumo = p.rest2 + deltaCoste * (V / p.vRef) * rG;
  const P = (vo2Consumo * p.masa * KJ_PER_L) / 60;

  return { V, P };
}

/**
 * Radio teórico alcanzable en llano (m) para el sol s.
 * Utilizado para la validación del paso 1 (≈ 1,7 km el sol 1) y comparación analítica.
 *
 * @param s Sol transcurrido desde el aterrizaje.
 * @param p Parámetros del astronauta y del traje.
 * @param tEvaE Presupuesto de soporte vital en horas (4 o 6) o en segundos. Por defecto 6 horas (21600 s).
 * @returns Distancia máxima en metros de ida y vuelta en llano.
 */
export function radioLlano(
  s: number,
  p: Parametros,
  tEvaE: number = T_EVA,
): number {
  const { V, P } = marcha(0, s, p);
  if (V <= 0) return 0;

  const tEvaESeg = tEvaE <= 24 ? tEvaE * 3600 : tEvaE;

  const dT = (V * ((1 - RHO) * T_EVA - T_TASK)) / 2;
  const dE =
    (V * ((1 - RHO) * P_DES * tEvaESeg - P_TASK * T_TASK)) /
    (2 * Math.max(P, 1));

  const radio = Math.min(dT, dE);
  return Math.max(0, radio);
}

