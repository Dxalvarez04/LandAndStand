/**
 * CAPA 4 · Grafo del terreno, 8 vecinos (sección 4).
 * La geometría (dist, S, G, theta, ratio) se precalcula UNA vez a partir del DEM.
 * Por sorteo solo cambian V, P, t, e.
 */
import { CELDA_M, N } from "@/lib/constants";
import { thetaMax } from "./fisiologia";
import { marcha, ratio as calcularRatio } from "./marcha";
import type { Parametros } from "./tipos";

export interface Geometria {
  /** Desplazamiento inicial de aristas de cada nodo u (formato CSR). Tamaño N*N + 1 */
  offsets: Int32Array;
  /** Nodo destino v para cada arista k. Tamaño ~95484 */
  destino: Int32Array;
  /** Distancia de la arista en metros (32 o ~45.25 m) */
  dist: Float32Array;
  /** Pendiente en % (100 * S) */
  G: Float32Array;
  /** Ángulo de inclinación en grados sexagesimales (degrees(atan(|S|))) */
  theta: Float32Array;
  /** Ratio de coste metabólico Minetti precalculado (ratio(G)) */
  ratio: Float32Array;
  /** Índice de la arista inversa (v→u) en este mismo grafo */
  revEdge: Int32Array;
}

export interface CostesAristas {
  /** Energía consumida en julios (J) por arista. Infinity si no es factible. */
  energia: Float32Array;
  /** Tiempo de tránsito en segundos (s) por arista. Infinity si no es factible. */
  tiempo: Float32Array;
  /** Indicador binario de factibilidad (1 = factible, 0 = no factible) */
  factible: Uint8Array;
}

// 8 direcciones relativas: [dr, dc]
// Fila 0 = SUR (+dr va al norte), Columna 0 = OESTE (+dc va al este)
const DR = [-1, -1, -1, 0, 0, 1, 1, 1];
const DC = [-1, 0, 1, -1, 1, -1, 0, 1];
// Dirección opuesta para cada una de las 8 direcciones (OPP[d] = 7 - d)
const OPP = [7, 6, 5, 4, 3, 2, 1, 0];

const SQRT2 = Math.SQRT2;
const DIST_ORTOGONAL = CELDA_M;
const DIST_DIAGONAL = CELDA_M * SQRT2;
const RAD_A_GRAD = 180 / Math.PI;

/**
 * Construye la geometría y topología del grafo a partir del DEM (110 × 110).
 * Se ejecuta una sola vez para toda la sesión.
 *
 * @param dem Matriz de elevaciones 110×110, fila 0 = SUR, columna 0 = OESTE.
 */
export function construirGeometria(dem: Float32Array): Geometria {
  const numNodos = N * N;
  const offsets = new Int32Array(numNodos + 1);

  // 1. Contar aristas válidas por nodo
  let totalAristas = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const u = r * N + c;
      offsets[u] = totalAristas;
      for (let d = 0; d < 8; d++) {
        const nr = r + DR[d];
        const nc = c + DC[d];
        if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
          totalAristas++;
        }
      }
    }
  }
  offsets[numNodos] = totalAristas;

  // 2. Alojar arrays contiguos para formato CSR
  const destino = new Int32Array(totalAristas);
  const dist = new Float32Array(totalAristas);
  const G = new Float32Array(totalAristas);
  const theta = new Float32Array(totalAristas);
  const ratioArr = new Float32Array(totalAristas);
  const revEdge = new Int32Array(totalAristas);

  // Tabla temporal para mapear (nodo, dirección) -> índice de arista
  // Para 12100 nodos y 8 direcciones = 96800 enteros
  const edgeByDir = new Int32Array(numNodos * 8);
  edgeByDir.fill(-1);

  let edgeIdx = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const u = r * N + c;
      const zU = dem[u];

      for (let d = 0; d < 8; d++) {
        const nr = r + DR[d];
        const nc = c + DC[d];

        if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
          const v = nr * N + nc;
          const zV = dem[v];

          const esDiagonal = Math.abs(DR[d]) + Math.abs(DC[d]) === 2;
          const dMetros = esDiagonal ? DIST_DIAGONAL : DIST_ORTOGONAL;

          const S = (zV - zU) / dMetros;
          const gVal = 100 * S;
          const thVal = Math.atan(Math.abs(S)) * RAD_A_GRAD;
          const rVal = calcularRatio(gVal);

          destino[edgeIdx] = v;
          dist[edgeIdx] = dMetros;
          G[edgeIdx] = gVal;
          theta[edgeIdx] = thVal;
          ratioArr[edgeIdx] = rVal;

          edgeByDir[u * 8 + d] = edgeIdx;
          edgeIdx++;
        }
      }
    }
  }

  // 3. Enlazar aristas inversas revEdge
  // Para la arista u->v en dirección d, la inversa v->u está en dirección OPP[d]
  for (let u = 0; u < numNodos; u++) {
    const start = offsets[u];
    const end = offsets[u + 1];

    for (let k = start; k < end; k++) {
      const v = destino[k];
      const rU = Math.floor(u / N);
      const cU = u % N;
      const rV = Math.floor(v / N);
      const cV = v % N;

      const dr = rV - rU;
      const dc = cV - cU;

      let dir = -1;
      for (let d = 0; d < 8; d++) {
        if (DR[d] === dr && DC[d] === dc) {
          dir = d;
          break;
        }
      }

      const oppDir = OPP[dir];
      const revIdx = edgeByDir[v * 8 + oppDir];
      revEdge[k] = revIdx;
    }
  }

  return {
    offsets,
    destino,
    dist,
    G,
    theta,
    ratio: ratioArr,
    revEdge,
  };
}

/**
 * Evalúa el coste en tiempo (t) y energía (e) de todas las aristas para un sol y astronauta dados.
 *
 * Condiciones de factibilidad (especificación sección 4):
 *   factible = (V > 0.02) y (|G| <= 45) y (theta <= theta_max(s))
 *   t = dist / V (solo si factible)
 *   e = P * t    (solo si factible)
 *
 * @param geo Geometría precalculada.
 * @param s Sol transcurrido.
 * @param p Parámetros del astronauta y del traje.
 * @param out Objeto de salida opcional para reutilizar memoria y evitar recolección de basura.
 */
export function evaluarAristas(
  geo: Geometria,
  s: number,
  p: Parametros,
  out?: CostesAristas,
): CostesAristas {
  const m = geo.destino.length;
  const energia = out ? out.energia : new Float32Array(m);
  const tiempo = out ? out.tiempo : new Float32Array(m);
  const factible = out ? out.factible : new Uint8Array(m);

  const thMax = thetaMax(s, p);

  for (let k = 0; k < m; k++) {
    const gVal = geo.G[k];
    const thVal = geo.theta[k];

    // Criterios geométricos de exclusión:
    // 1. Dominio de validez Minetti (|G| <= 45%)
    // 2. Límite de equilibrio del astronauta (theta <= theta_max(s))
    if (Math.abs(gVal) > 45 || thVal > thMax) {
      energia[k] = Infinity;
      tiempo[k] = Infinity;
      factible[k] = 0;
      continue;
    }

    const { V, P } = marcha(gVal, s, p);

    // 3. Velocidad mínima viable (V > 0.02 m/s)
    if (V <= 0.02) {
      energia[k] = Infinity;
      tiempo[k] = Infinity;
      factible[k] = 0;
      continue;
    }

    const d = geo.dist[k];
    const t = d / V;
    const e = P * t;

    energia[k] = e;
    tiempo[k] = t;
    factible[k] = 1;
  }

  return { energia, tiempo, factible };
}

