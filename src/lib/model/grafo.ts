/**
 * CAPA 4 · Grafo del terreno, 8 vecinos (sección 4).
 * La geometría (dist, S, G, theta, ratio) se precalcula UNA vez a partir del DEM.
 * Por sorteo solo cambian V, P, t, e.
 */

export interface Geometria {
  /** Para cada nodo u, aristas u→v en formato CSR */
  offsets: Int32Array;
  destino: Int32Array;
  dist: Float32Array;
  G: Float32Array;
  theta: Float32Array;
}

/** dem: 110×110, fila 0 = SUR. */
export function construirGeometria(_dem: Float32Array): Geometria {
  throw new Error("TODO persona 1: capa 4, construirGeometria");
}
