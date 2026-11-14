/**
 * EL CONTRATO entre las tres partes (ver README, «El contrato entre las tres partes»).
 * No se cambia sin avisar a los otros dos.
 *
 *   Persona 3 (panel)  → modifica `Estado`
 *   Persona 1 (cálculo) → recibe `Estado`, devuelve `Resultado`
 *   Persona 2 (mapa)   → pinta `Resultado.prob`; persona 3 → pinta `Resultado.destinos`
 */

export type Modo = "tripulante" | "pareja" | "grupo";

/** "U" = U(0,30; 0,40) (por defecto). El resto son escenarios fijos. */
export type FWalk = "U" | 0.3 | 0.35 | 0.4 | 0.45 | 0.5;

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
  /** 1 en modo tripulante, 2 en modo pareja y 3 o más en modo grupo (sin límite) */
  tripulantes: Tripulante[];
  fwalk: FWalk;
  energiaHoras: EnergiaHoras;
}

export type IdDestino = "T1" | "T2" | "T3" | "T4" | "T5" | "T6";

export interface Resultado {
  /** 110 × 110, índice = fila * 110 + columna. Fila 0 = SUR, columna 0 = oeste. */
  prob: Float32Array;
  /** 110 × 110 elevaciones del DEM en metros. Fila 0 = SUR. Opcional hasta que el modelo real la aporte. */
  elevacion?: Float32Array;
  destinos: { id: IdDestino; p: number }[];
}

// ---- Ruta ilustrativa del inspector (EXTENSIÓN OPCIONAL, añadida por la persona 2) ----
// Con los parámetros centrales (sección 5): ida = cadena de pred_o desde H hasta la celda,
// vuelta = cadena de pred_b desde la celda hasta H. Índices fila * 110 + columna.
// Ruta vacía (ida.length === 0) = no hay camino dentro del presupuesto de energía.
// `null` = el modelo no calcula rutas (el mapa dibuja entonces una ruta aproximada).

export interface Ruta {
  ida: Int32Array;
  vuelta: Int32Array;
}

// ---- Mensajes del Web Worker ----

// Un cálculo nuevo (calcular o contar) deja obsoleto al anterior: el worker lo abandona en cuanto
// puede y no responde por él. Así, al arrastrar un deslizador solo se calcula el último valor.
// «contar» reparte el Monte Carlo entre varios workers: cada uno suma su tramo de sorteos
// (parte de partes) y la página junta los conteos.

export type MensajeAlWorker =
  | { tipo: "calcular"; id: number; estado: Estado }
  | { tipo: "contar"; id: number; estado: Estado; parte: number; partes: number }
  | { tipo: "ruta"; id: number; estado: Estado; celda: number };

export type MensajeDelWorker =
  | { tipo: "ruta"; id: number; ruta: Ruta | null }
  | { tipo: "progreso"; id: number; fraccion: number }
  | { tipo: "resultado"; id: number; resultado: Resultado }
  /** Sorteos ya sumados por esta parte (de `total` sorteos en todo el cálculo) */
  | { tipo: "avance"; id: number; hechos: number; total: number }
  /** Celdas alcanzables contadas en el tramo de esta parte; la parte 0 envía además el DEM */
  | { tipo: "conteo"; id: number; conteo: Int32Array; total: number; elevacion?: Float32Array }
  | { tipo: "error"; id: number; mensaje: string };
