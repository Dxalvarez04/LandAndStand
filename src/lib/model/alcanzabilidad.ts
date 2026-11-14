/**
 * CAPA 5 · Alcanzabilidad de ida y vuelta (sección 5).
 * - IDA: Dijkstra por energía desde H sobre el grafo directo.
 * - VUELTA: Dijkstra por energía desde H sobre el GRAFO INVERSO.
 * - Tiempos acumulados sobre ESOS MISMOS caminos (no un Dijkstra de tiempo aparte).
 * - Montículo binario indexado con arrays contiguos para máxima eficiencia.
 */
import { P_DES, P_TASK, RHO, T_EVA, T_TASK } from "@/lib/constants";
import { evaluarAristas, type CostesAristas, type Geometria } from "./grafo";
import type { Parametros } from "./tipos";

export interface Alcance {
  /** Máscara binaria 110×110: 1 = alcanzable (ida y vuelta cumpliendo tiempo y energía), 0 = no alcanzable */
  mascara: Uint8Array;
  /** Predecesor de cada celda en el camino de ida H -> c (-1 para el hábitat o inaccesibles) */
  predIda: Int32Array;
  /** Siguiente celda en el camino de vuelta c -> H (-1 para el hábitat o inaccesibles) */
  predVuelta: Int32Array;
}

/**
 * Montículo binario indexado (Priority Queue) implementado sobre TypedArrays.
 * Permite inserción y decreaseKey en O(log V) sin duplicar nodos en memoria.
 */
class IndexedMinHeap {
  private nodes: Int32Array;
  private keys: Float64Array;
  private pos: Int32Array;
  public size: number = 0;

  constructor(maxCapacidad: number) {
    this.nodes = new Int32Array(maxCapacidad);
    this.keys = new Float64Array(maxCapacidad);
    this.pos = new Int32Array(maxCapacidad);
    this.pos.fill(-1);
  }

  public clear(): void {
    this.pos.fill(-1);
    this.size = 0;
  }

  public insertOrDecreaseKey(node: number, key: number): void {
    const p = this.pos[node];
    if (p === -1) {
      const i = this.size++;
      this.nodes[i] = node;
      this.keys[i] = key;
      this.pos[node] = i;
      this.bubbleUp(i);
    } else if (key < this.keys[p]) {
      this.keys[p] = key;
      this.bubbleUp(p);
    }
  }

  public popMin(): number {
    if (this.size === 0) return -1;
    const minNode = this.nodes[0];
    this.pos[minNode] = -1;
    this.size--;
    if (this.size > 0) {
      const lastNode = this.nodes[this.size];
      const lastKey = this.keys[this.size];
      this.nodes[0] = lastNode;
      this.keys[0] = lastKey;
      this.pos[lastNode] = 0;
      this.bubbleDown(0);
    }
    return minNode;
  }

  private bubbleUp(i: number): void {
    const node = this.nodes[i];
    const key = this.keys[i];
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent] <= key) break;
      const pNode = this.nodes[parent];
      this.nodes[i] = pNode;
      this.keys[i] = this.keys[parent];
      this.pos[pNode] = i;
      i = parent;
    }
    this.nodes[i] = node;
    this.keys[i] = key;
    this.pos[node] = i;
  }

  private bubbleDown(i: number): void {
    const node = this.nodes[i];
    const key = this.keys[i];
    const half = this.size >> 1;
    while (i < half) {
      const left = (i << 1) + 1;
      const right = left + 1;
      let best = left;
      if (right < this.size && this.keys[right] < this.keys[left]) {
        best = right;
      }
      if (key <= this.keys[best]) break;
      const bNode = this.nodes[best];
      this.nodes[i] = bNode;
      this.keys[i] = this.keys[best];
      this.pos[bNode] = i;
      i = best;
    }
    this.nodes[i] = node;
    this.keys[i] = key;
    this.pos[node] = i;
  }
}

/** Memoria de trabajo de alcanzable() por geometría: el Monte Carlo la llama cientos de veces seguidas. */
interface Memoria {
  costes: CostesAristas;
  Eo: Float64Array;
  To: Float64Array;
  Eb: Float64Array;
  Tb: Float64Array;
  heap: IndexedMinHeap;
}

const memorias = new WeakMap<Geometria, Memoria>();

function memoriaDe(geo: Geometria): Memoria {
  let m = memorias.get(geo);
  if (!m) {
    const n = geo.offsets.length - 1;
    const a = geo.destino.length;
    m = {
      costes: { energia: new Float32Array(a), tiempo: new Float32Array(a), factible: new Uint8Array(a) },
      Eo: new Float64Array(n),
      To: new Float64Array(n),
      Eb: new Float64Array(n),
      Tb: new Float64Array(n),
      heap: new IndexedMinHeap(n),
    };
    memorias.set(geo, m);
  }
  return m;
}

/**
 * Calcula la alcanzabilidad de ida y vuelta para una configuración dada.
 *
 * @param geo Geometría precalculada de la malla 110×110.
 * @param habitat Índice de la celda del hábitat (e.g. 84 * 110 + 42 = 9282).
 * @param s Sol de la misión (1..30).
 * @param p Parámetros del astronauta y del traje.
 * @param energiaHoras Presupuesto energético del soporte vital: 6 (caso base) o 4 (escenario Apolo).
 */
export function alcanzable(
  geo: Geometria,
  habitat: number,
  s: number,
  p: Parametros,
  energiaHoras: 6 | 4,
): Alcance {
  const numNodos = geo.offsets.length - 1;
  const memo = memoriaDe(geo);

  // 1. Evaluar costes de aristas para este sorteo/sol (en memoria reutilizada: no se devuelven)
  const costes = evaluarAristas(geo, s, p, memo.costes);

  // 2. Presupuestos y reservas
  const tEvaESeg = energiaHoras * 3600;
  const factorUtil = 1 - RHO; // 0.80

  const tPresupuestoTotal = factorUtil * T_EVA; // 17 280 s
  const ePresupuestoTotal = factorUtil * P_DES * tEvaESeg; // 6 082 560 J (6h) o 4 055 040 J (4h)

  const eTarea = P_TASK * T_TASK; // 300 W * 1800 s = 540 000 J
  const tTarea = T_TASK; // 1800 s

  // Límites máximos que puede consumir la marcha (ida + vuelta)
  const eMarchaMax = ePresupuestoTotal - eTarea;

  // Estructuras de datos para Dijkstra (las de trabajo se reutilizan entre llamadas)
  const { Eo, To, Eb, Tb, heap } = memo;
  Eo.fill(Infinity);
  To.fill(Infinity);
  Eb.fill(Infinity);
  Tb.fill(Infinity);
  heap.clear();
  const predIda = new Int32Array(numNodos).fill(-1);
  const predVuelta = new Int32Array(numNodos).fill(-1);

  // =========================================================================
  // PASO 1: Dijkstra de IDA (desde Hábitat, grafo directo, peso = energía)
  // =========================================================================
  Eo[habitat] = 0;
  To[habitat] = 0;
  heap.insertOrDecreaseKey(habitat, 0);

  while (heap.size > 0) {
    const u = heap.popMin();
    const eU = Eo[u];

    // Optimización: no expandir nodos cuya energía de ida ya supera el presupuesto
    if (eU > eMarchaMax) {
      break;
    }

    const start = geo.offsets[u];
    const end = geo.offsets[u + 1];

    for (let k = start; k < end; k++) {
      if (costes.factible[k] === 0) continue;

      const v = geo.destino[k];
      const eArista = costes.energia[k];
      const tArista = costes.tiempo[k];

      const newE = eU + eArista;
      if (newE < Eo[v]) {
        Eo[v] = newE;
        To[v] = To[u] + tArista;
        predIda[v] = u;
        heap.insertOrDecreaseKey(v, newE);
      }
    }
  }

  // =========================================================================
  // PASO 2: Dijkstra de VUELTA (desde Hábitat, grafo inverso, peso = energía)
  // En el grafo inverso, avanzar hacia v usa el coste de la arista opuesta v->u
  // =========================================================================
  heap.clear();
  Eb[habitat] = 0;
  Tb[habitat] = 0;
  heap.insertOrDecreaseKey(habitat, 0);

  while (heap.size > 0) {
    const u = heap.popMin();
    const eU = Eb[u];

    if (eU > eMarchaMax) {
      break;
    }

    const start = geo.offsets[u];
    const end = geo.offsets[u + 1];

    for (let k = start; k < end; k++) {
      // La arista en el grafo original es v -> u, ubicada en geo.revEdge[k]
      const revK = geo.revEdge[k];
      if (costes.factible[revK] === 0) continue;

      const v = geo.destino[k];
      const eArista = costes.energia[revK];
      const tArista = costes.tiempo[revK];

      const newE = eU + eArista;
      if (newE < Eb[v]) {
        Eb[v] = newE;
        Tb[v] = Tb[u] + tArista;
        predVuelta[v] = u; // Desde v, el siguiente paso hacia H es u
        heap.insertOrDecreaseKey(v, newE);
      }
    }
  }

  // =========================================================================
  // PASO 3: Verificación simultánea de presupuestos de tiempo y energía
  // =========================================================================
  const mascara = new Uint8Array(numNodos);

  for (let c = 0; c < numNodos; c++) {
    const eIda = Eo[c];
    const eVuelta = Eb[c];

    if (eIda !== Infinity && eVuelta !== Infinity) {
      const tiempoTotal = To[c] + tTarea + Tb[c];
      const energiaTotal = eIda + eTarea + eVuelta;

      if (tiempoTotal <= tPresupuestoTotal && energiaTotal <= ePresupuestoTotal) {
        mascara[c] = 1;
      }
    }
  }

  return { mascara, predIda, predVuelta };
}

