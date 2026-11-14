/**
 * CAPA 3 · Marcha con traje, modelo M2 (sección 3).
 * Minetti (ratio), Tobler acotado, v_met, tope de bajada y potencia DESPUÉS del tope.
 */
import type { Parametros } from "./tipos";

export function ratio(_G: number): number {
  throw new Error("TODO persona 1: capa 3, ratio (Minetti 2002)");
}

export function tobler(_S: number, _vFlat: number): number {
  throw new Error("TODO persona 1: capa 3, tobler");
}

/** Velocidad (m/s) y potencia (W) en pendiente G (%) el sol s. */
export function marcha(_G: number, _s: number, _p: Parametros): { V: number; P: number } {
  throw new Error("TODO persona 1: capa 3, marcha");
}

/** Radio en llano (m), para la validación del paso 1 (≈ 1,7 km el sol 1). */
export function radioLlano(_s: number, _p: Parametros, _tEvaE: number): number {
  throw new Error("TODO persona 1: capa 3, radioLlano");
}
