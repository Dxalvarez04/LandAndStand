/**
 * Punto de entrada del cálculo. Lo llama el Web Worker.
 *
 * Mientras las capas 2–6 no estén listas devuelve el resultado inventado.
 * Cuando estén: cargar DEM y sorteos (una sola vez) y llamar a `agregar`.
 */
import type { Estado, Resultado } from "@/lib/contract";
import { resultadoFalso } from "@/lib/mock/resultadoFalso";

export const MODELO_REAL = false;

export async function calcular(
  estado: Estado,
  onProgreso: (fraccion: number) => void,
): Promise<Resultado> {
  if (!MODELO_REAL) {
    onProgreso(1);
    return resultadoFalso(estado);
  }
  // TODO persona 1:
  // const datos = await cargarDatos();   // fetch("/data/dem_real.bin"), sorteos…
  // return agregar(estado, datos, onProgreso);
  throw new Error("Modelo real no implementado");
}
