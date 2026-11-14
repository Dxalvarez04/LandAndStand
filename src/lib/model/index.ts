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
import type { Estado, Resultado } from "@/lib/contract";
import { ELEVACION_PROVISIONAL } from "@/lib/mock/elevacionFalsa";
import { agregar, generarSorteos, type Datos } from "./montecarlo";
import type { Parametros } from "./tipos";

export const MODELO_REAL = true;

let datosCargados: Datos | null = null;

async function cargarDatos(): Promise<Datos> {
  if (datosCargados) return datosCargados;

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

  datosCargados = { dem, sorteos };
  return datosCargados;
}

export async function calcular(
  estado: Estado,
  onProgreso: (fraccion: number) => void,
): Promise<Resultado> {
  const datos = await cargarDatos();
  const resultado = agregar(estado, datos, onProgreso);
  return { ...resultado, elevacion: datos.dem };
}

