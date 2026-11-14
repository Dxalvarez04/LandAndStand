/**
 * Punto de entrada del cálculo. Lo llama el Web Worker.
 *
 * Integra las capas 2 a 6 del modelo fisiológico y de terreno:
 * - Capa 2: Fisiología (recuperación de vo2max y equilibrio theta_max)
 * - Capa 3: Marcha con traje (modelo M2, curva Minetti y tope de bajada)
 * - Capa 4: Grafo del terreno (8 vecinos, CSR)
 * - Capa 5: Alcanzabilidad (Dijkstra ida + vuelta inverso con montículo binario)
 * - Capa 6: Incertidumbre y agregación (Monte Carlo de 300 sorteos)
 */
import type { Estado, Resultado, Ruta } from "@/lib/contract";
import { CENTRALES, N } from "@/lib/constants";
import { HABITAT, kmACelda } from "@/lib/data/targets";
import { ELEVACION_PROVISIONAL } from "@/lib/mock/elevacionFalsa";
import { alcanzable } from "./alcanzabilidad";
import { construirGeometria } from "./grafo";
import { agregar, generarSorteos, type Datos } from "./montecarlo";
import type { Parametros } from "./tipos";

export const MODELO_REAL = true;

let datosCargados: Promise<Datos> | null = null;

/** DEM y sorteos, una sola vez por worker (las peticiones simultáneas comparten la misma carga). */
export function cargarDatos(): Promise<Datos> {
  datosCargados ??= leerDatos();
  return datosCargados;
}

async function leerDatos(): Promise<Datos> {
  let dem: Float32Array;
  try {
    const resp = await fetch("/data/dem_real.bin");
    if (resp.ok) {
      const buf = await resp.arrayBuffer();
      dem = new Float32Array(buf);
    } else {
      // DEM provisional mientras no esté disponible dem_real.bin.
      dem = ELEVACION_PROVISIONAL;
    }
  } catch {
    dem = ELEVACION_PROVISIONAL;
  }

  let sorteos: Parametros[];
  try {
    const resp = await fetch("/data/draws_seed11_300.json");
    if (resp.ok) {
      sorteos = await resp.json();
    } else {
      sorteos = generarSorteos(300, 11);
    }
  } catch {
    sorteos = generarSorteos(300, 11);
  }

  return { dem, sorteos };
}

export async function calcular(
  estado: Estado,
  onProgreso: (fraccion: number) => void,
): Promise<Resultado> {
  const datos = await cargarDatos();
  const resultado = agregar(estado, datos, onProgreso);
  return { ...resultado, elevacion: datos.dem };
}

/**
 * Ruta ilustrativa para la ficha del mapa (extensión opcional del contrato).
 * Ejecuta la capa 5 una vez con los parámetros CENTRALES (sección 6), el primer tripulante y el
 * escenario elegido, y sigue las cadenas de predecesores:
 *   ida    = H → celda (predIda, invertida)
 *   vuelta = celda → H (predVuelta)
 * Son los caminos de menor energía. Si alguna de las dos no llega (fuera del presupuesto de
 * energía), devuelve una ruta vacía: el mapa muestra «Sin ruta».
 */
export async function calcularRuta(estado: Estado, celda: number): Promise<Ruta | null> {
  const datos = await cargarDatos();
  if (!datos.geometria) datos.geometria = construirGeometria(datos.dem);
  const h = kmACelda(HABITAT.northKm, HABITAT.eastKm);
  const habitat = h.fila * N + h.columna;
  const t = estado.tripulantes[0] ?? { vo2pre: CENTRALES.vo2pre, masa: CENTRALES.masa };
  const p: Parametros = {
    ...CENTRALES,
    vo2pre: t.vo2pre,
    masa: t.masa,
    fWalk: estado.fwalk === "U" ? CENTRALES.fWalk : estado.fwalk,
  };
  const { predIda, predVuelta } = alcanzable(datos.geometria, habitat, estado.sol, p, estado.energiaHoras);

  const vacia: Ruta = { ida: new Int32Array(0), vuelta: new Int32Array(0) };
  if (celda === habitat) return vacia;
  const seguir = (pred: Int32Array): number[] | null => {
    const camino = [celda];
    for (let c = celda; c !== habitat; ) {
      c = pred[c];
      if (c < 0 || camino.length > N * N) return null;
      camino.push(c);
    }
    return camino; // celda … H
  };
  const ida = seguir(predIda);
  const vuelta = seguir(predVuelta);
  if (!ida || !vuelta) return vacia;
  return { ida: Int32Array.from(ida.reverse()), vuelta: Int32Array.from(vuelta) };
}
