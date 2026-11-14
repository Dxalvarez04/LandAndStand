/**
 * CAPA 5 · Alcanzabilidad de ida y vuelta (sección 5).
 * - IDA: Dijkstra por energía desde H.
 * - VUELTA: Dijkstra por energía desde H sobre el GRAFO INVERSO.
 * - Tiempos acumulados sobre ESOS MISMOS caminos (no un Dijkstra de tiempo aparte).
 * - Montículo binario.
 */
import type { Geometria } from "./grafo";
import type { Parametros } from "./tipos";

export interface Alcance {
  mascara: Uint8Array; // 110×110, 1 = alcanzable
  predIda: Int32Array;
  predVuelta: Int32Array;
}

export function alcanzable(
  _geo: Geometria,
  _habitat: number,
  _s: number,
  _p: Parametros,
  _energiaHoras: 6 | 4,
): Alcance {
  throw new Error("TODO persona 1: capa 5, alcanzable");
}
