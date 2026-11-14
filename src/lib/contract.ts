/**
 * EL CONTRATO entre las tres partes (ver README, «El contrato entre las tres partes»).
 * No se cambia sin avisar a los otros dos.
 *
 *   Persona 3 (panel)  → modifica `Estado`
 *   Persona 1 (cálculo) → recibe `Estado`, devuelve `Resultado`
 *   Persona 2 (mapa)   → pinta `Resultado.prob`; persona 3 → pinta `Resultado.destinos`
 */

export type Modo = "poblacion" | "tripulante" | "pareja";

/** "U" = U(0,30; 0,40) (por defecto). El resto son escenarios fijos. */
export type FWalk = "U" | 0.3 | 0.35 | 0.4 | 0.47 | 0.5;

export type EnergiaHoras = 6 | 4;

export interface Tripulante {
  /** VO₂máx previo al vuelo, mL/kg/min */
  vo2pre: number;
  /** Masa corporal, kg */
  masa: number;
}

export interface Estado {
  /** 1..30 */
  sol: number;
  modo: Modo;
  /** 1 en modo tripulante, 2 en modo pareja; se ignora en modo población */
  tripulantes: Tripulante[];
  fwalk: FWalk;
  energiaHoras: EnergiaHoras;
}

export type IdDestino = "T1" | "T2" | "T3" | "T4" | "T5" | "T6";

export interface Resultado {
  /** 110 × 110, índice = fila * 110 + columna. Fila 0 = SUR, columna 0 = oeste. */
  prob: Float32Array;
  destinos: { id: IdDestino; p: number }[];
}

// ---- Mensajes del Web Worker ----

export type MensajeAlWorker = { tipo: "calcular"; id: number; estado: Estado };

export type MensajeDelWorker =
  | { tipo: "progreso"; id: number; fraccion: number }
  | { tipo: "resultado"; id: number; resultado: Resultado }
  | { tipo: "error"; id: number; mensaje: string };
