/**
 * Datos que usa el mapa y que llegan como archivos estáticos en /public/data.
 * Todos son opcionales: si faltan, el mapa sigue funcionando y avisa.
 */
import { N } from "@/lib/constants";

export const RUTA_IMAGEN = "/data/aoi_color.jpg";
export const RUTA_DEM = "/data/dem_real.bin"; // el mismo archivo que lee el cálculo

/** DEM float32 little-endian, 110 × 110, fila 0 = SUR (ver scripts/npy_a_bin.py). */
export async function cargarDem(): Promise<Float32Array | null> {
  try {
    const r = await fetch(RUTA_DEM);
    if (!r.ok) return null;
    const buf = await r.arrayBuffer();
    if (buf.byteLength !== N * N * 4) {
      console.warn(`[mapa] ${RUTA_DEM} mide ${buf.byteLength} bytes; se esperaban ${N * N * 4}`);
      return null;
    }
    return new Float32Array(buf);
  } catch {
    return null;
  }
}

export function existeImagen(src = RUTA_IMAGEN): Promise<boolean> {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(true);
    img.onerror = () => ok(false);
    img.src = src;
  });
}
